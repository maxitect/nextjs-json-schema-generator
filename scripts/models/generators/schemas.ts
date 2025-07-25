#!/usr/bin/env tsx

import { ColumnConfig, EnumsConfig, TableConfig } from "../../lib/config";
import {
  writeAndFormatFile,
  loadEnums,
  loadAllTables,
} from "../../lib/fileSystem";
import {
  generateFileHeader,
  generateImports,
  validateTableConfig,
} from "../../lib/template";
import { toCamelCase, toSingularCamelCase } from "../../lib/stringTransforms";
import { generateModelAggregation } from "../utils/aggregation";

// Generate Drizzle enum definitions
function generateEnumDefinitions(enums: EnumsConfig): string {
  const enumDefs = Object.entries(enums)
    .map(([enumName, config]) => {
      const values = Object.keys(config)
        .filter((key) => key !== "description")
        .map((v) => `'${v}'`)
        .join(", ");
      return `export const ${toCamelCase(
        enumName,
      )} = pgEnum('${enumName}', [${values}]);`;
    })
    .join("\n");

  return enumDefs + "\n\n";
}

// Map column type to Drizzle syntax with field key
function mapColumnToDrizzle(
  columnName: string,
  columnConfig: ColumnConfig,
  enums: EnumsConfig,
  hasCompositePrimaryKey: boolean = false,
): string {
  const {
    type,
    length,
    precision,
    scale,
    nullable,
    default: defaultValue,
    primaryKey,
    unique,
    references,
  } = columnConfig.dbConstraints;

  // Convert snake_case to camelCase for field key
  const fieldKey = toCamelCase(columnName);

  let drizzleType = "";
  const constraints: string[] = [];

  switch (type) {
    case "varchar":
      drizzleType = length
        ? `varchar('${columnName}', { length: ${length} })`
        : `varchar('${columnName}')`;
      break;
    case "text":
      drizzleType = `text('${columnName}')`;
      break;
    case "integer":
      drizzleType = `integer('${columnName}')`;
      break;
    case "serial":
      drizzleType = `integer('${columnName}')`;
      constraints.push(".primaryKey()");
      constraints.push(".generatedAlwaysAsIdentity()");
      break;
    case "numeric":
    case "decimal":
      if (precision && scale) {
        drizzleType = `numeric('${columnName}', { precision: ${precision}, scale: ${scale} })`;
      } else {
        drizzleType = `numeric('${columnName}')`;
      }
      break;
    case "money":
      drizzleType = `numeric('${columnName}', { precision: 10, scale: 2 })`;
      break;
    case "timestamp":
      drizzleType = `timestamp('${columnName}', { mode: 'date' })`;
      break;
    case "date":
      drizzleType = `date('${columnName}', { mode: 'date' })`;
      break;
    case "boolean":
      drizzleType = `boolean('${columnName}')`;
      break;
    case "geography":
      // Simplified - in real implementation you'd use PostGIS extension
      drizzleType = `text('${columnName}')`;
      break;
    default:
      // Check if it's an enum
      const enumKey = Object.keys(enums).find(
        (key) => key === type || key === `${type}_enum`,
      );
      if (enumKey) {
        drizzleType = `${toCamelCase(enumKey)}('${columnName}')`;
      } else {
        drizzleType = `text('${columnName}')`;
      }
  }

  // Add constraints in the correct order
  if (defaultValue !== undefined && type !== "serial") {
    if (defaultValue === "now()") {
      constraints.push(".defaultNow()");
    } else if (typeof defaultValue === "string") {
      constraints.push(`.default('${defaultValue}')`);
    } else if (typeof defaultValue === "boolean") {
      constraints.push(`.default(${defaultValue})`);
    } else if (type === "numeric" || type === "decimal" || type === "money") {
      // Numeric types need string defaults in Drizzle
      constraints.push(`.default('${defaultValue}')`);
    } else {
      constraints.push(`.default(${defaultValue})`);
    }
  }

  if (!nullable && type !== "serial") {
    constraints.push(".notNull()");
  }

  if (unique && type !== "serial" && !primaryKey) {
    constraints.push(".unique()");
  }

  if (primaryKey && type !== "serial" && !hasCompositePrimaryKey) {
    constraints.push(".primaryKey()");
  }

  if (references) {
    constraints.push(
      `.references(() => ${toCamelCase(references.table)}.${references.column}${
        references.onDelete ? `, { onDelete: '${references.onDelete}' }` : ""
      })`,
    );
  }

  return `  ${fieldKey}: ${drizzleType}${constraints.join("")}`;
}

// Generate table definition with indexes in callback
function generateTableDefinition(
  table: TableConfig,
  enums: EnumsConfig,
): string {
  const tableName = toCamelCase(table.tableName);

  // Check for composite primary key
  const primaryKeyColumns = Object.entries(table.columns)
    .filter(
      ([, config]) =>
        config.dbConstraints.primaryKey &&
        config.dbConstraints.type !== "serial",
    )
    .map(([columnName]) => columnName);

  const hasCompositePrimaryKey = primaryKeyColumns.length > 1;

  const columns = Object.entries(table.columns)
    .map(([columnName, columnConfig]) =>
      mapColumnToDrizzle(
        columnName,
        columnConfig,
        enums,
        hasCompositePrimaryKey,
      ),
    )
    .join(",\n");

  // Generate indexes and primary key constraints in callback format
  const constraints: string[] = [];

  // Add composite primary key if needed
  if (hasCompositePrimaryKey) {
    const pkColumns = primaryKeyColumns
      .map((col) => `table.${toCamelCase(col)}`)
      .join(", ");
    constraints.push(`  primaryKey({ columns: [${pkColumns}] })`);
  }

  // Add indexes
  if (table.indexes && Object.keys(table.indexes).length > 0) {
    const indexes = Object.entries(table.indexes).map(
      ([indexName, indexConfig]) => {
        const columns = indexConfig.columns
          .map((col) => `table.${toCamelCase(col)}`)
          .join(", ");
        return `  index('${indexName}').on(${columns})`;
      },
    );
    constraints.push(...indexes);
  }

  let constraintsCallback = "";
  if (constraints.length > 0) {
    constraintsCallback = `, (table) => [\n${constraints.join(",\n")}\n]`;
  }

  return `export const ${tableName} = pgTable('${table.tableName}', {\n${columns}\n}${constraintsCallback});`;
}

// Generate relations
function generateRelations(table: TableConfig): string {
  if (!table.relationships || Object.keys(table.relationships).length === 0) {
    return "";
  }

  const tableName = toCamelCase(table.tableName);
  const relations = Object.entries(table.relationships)
    .map(([relationName, relationConfig]) => {
      const relatedTable = toCamelCase(relationConfig.table);

      switch (relationConfig.type) {
        case "one-to-one":
          return `  ${relationName}: one(${relatedTable}),`;
        case "one-to-many":
          return `  ${relationName}: many(${relatedTable}),`;
        case "many-to-many":
          // Would need pivot table handling
          return `  // many-to-many relation: ${relationName}`;
        default:
          return `  // unknown relation type: ${relationName}`;
      }
    })
    .join("\n");

  return `\n\nexport const ${tableName}Relations = relations(${tableName}, ({ one, many }) => ({\n${relations}\n}));`;
}

// Generate complete schema file for a table
async function generateTableSchema(
  table: TableConfig,
  enums: EnumsConfig,
): Promise<string> {
  const errors = validateTableConfig(table);
  if (errors.length > 0) {
    throw new Error(
      `Invalid table configuration for ${table.tableName}: ${errors.join(", ")}`,
    );
  }

  let content = generateFileHeader(
    `Drizzle schema for ${table.tableName} table`,
  );

  // Analyze what imports are needed
  const pgCoreImports = new Set<string>(["pgTable"]); // Always need pgTable
  const drizzleImports = new Set<string>();

  // Check column types used
  Object.values(table.columns).forEach((columnConfig) => {
    const { type } = columnConfig.dbConstraints;

    switch (type) {
      case "varchar":
        pgCoreImports.add("varchar");
        break;
      case "text":
        pgCoreImports.add("text");
        break;
      case "integer":
      case "serial":
        pgCoreImports.add("integer");
        break;
      case "numeric":
      case "decimal":
      case "money":
        pgCoreImports.add("numeric");
        break;
      case "timestamp":
        pgCoreImports.add("timestamp");
        break;
      case "date":
        pgCoreImports.add("date");
        break;
      case "boolean":
        pgCoreImports.add("boolean");
        break;
      default:
    }
  });

  // Check if indexes are used
  if (table.indexes && Object.keys(table.indexes).length > 0) {
    pgCoreImports.add("index");
  }

  // Check if composite primary key is used
  const primaryKeyColumns = Object.entries(table.columns).filter(
    ([, config]) =>
      config.dbConstraints.primaryKey && config.dbConstraints.type !== "serial",
  );
  if (primaryKeyColumns.length > 1) {
    pgCoreImports.add("primaryKey");
  }

  // Check if default values use SQL functions (currently none since we use .defaultNow())
  // const hasDefaultNow = Object.values(table.columns).some(col =>
  //   col.dbConstraints.default === 'now()'
  // );
  // if (hasDefaultNow) {
  //   drizzleImports.add('sql');
  // }

  // Check if relations are used (for future use)
  if (table.relationships && Object.keys(table.relationships).length > 0) {
    drizzleImports.add("relations");
  }

  // Generate imports
  const imports: Record<string, string[]> = {};
  if (pgCoreImports.size > 0) {
    imports["drizzle-orm/pg-core"] = Array.from(pgCoreImports).sort();
  }
  if (drizzleImports.size > 0) {
    imports["drizzle-orm"] = Array.from(drizzleImports).sort();
  }

  content += generateImports(imports);

  // Generate enum references if needed
  const usedEnums = Object.values(table.columns)
    .map((col) => col.dbConstraints.type)
    .filter(
      (type) =>
        Object.keys(enums).includes(type) ||
        Object.keys(enums).includes(`${type}_enum`),
    );

  if (usedEnums.length > 0) {
    content += "// Enum imports\n";
    usedEnums.forEach((enumType) => {
      const enumKey = Object.keys(enums).find(
        (key) => key === enumType || key === `${enumType}_enum`,
      );
      if (enumKey) {
        content += `import { ${toCamelCase(enumKey)} } from '../enums';\n`;
      }
    });
    content += "\n";
  }

  // Generate table imports for foreign keys
  const referencedTables = Object.values(table.columns)
    .filter((col) => col.dbConstraints.references)
    .map((col) => col.dbConstraints.references!.table)
    .filter((table, index, arr) => arr.indexOf(table) === index); // unique

  if (referencedTables.length > 0) {
    content += "// Table imports for foreign keys\n";
    referencedTables.forEach((referencedTable) => {
      const tableVarName = toCamelCase(referencedTable);
      const fileName = toSingularCamelCase(referencedTable);
      content += `import { ${tableVarName} } from '../${fileName}';\n`;
    });
    content += "\n";
  }

  // Table definition (includes indexes in callback)
  content += generateTableDefinition(table, enums);

  // Relations
  content += generateRelations(table);

  return content;
}

// Generate enums file
async function generateEnumsFile(enums: EnumsConfig): Promise<void> {
  let content = generateFileHeader("Drizzle enum definitions");

  const imports = {
    "drizzle-orm/pg-core": ["pgEnum"],
  };

  content += generateImports(imports);
  content += generateEnumDefinitions(enums);

  await writeAndFormatFile("./src/models/enums/schema.ts", content);
}

// Main generation function
async function generateDrizzleSchemas(): Promise<void> {
  try {
    console.log("Generating Drizzle schemas from JSON configuration...");

    const enums = await loadEnums();
    const tables = await loadAllTables();

    console.log(
      `Found ${Object.keys(enums).length} enums and ${tables.length} tables`,
    );

    // Generate enums file
    await generateEnumsFile(enums);

    // Generate table schemas
    for (const table of tables) {
      const content = await generateTableSchema(table, enums);
      const fileName = toSingularCamelCase(table.tableName);
      await writeAndFormatFile(`./src/models/${fileName}/schema.ts`, content);
    }

    // Generate aggregation files
    await generateModelAggregation(tables, "schema");

    console.log("✅ Drizzle schemas and aggregation generated successfully!");
  } catch (error) {
    console.error("❌ Error generating Drizzle schemas:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDrizzleSchemas();
}

export { generateDrizzleSchemas };
