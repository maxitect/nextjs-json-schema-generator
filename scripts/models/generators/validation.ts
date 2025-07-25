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
import {
  toCamelCase,
  toPascalCase,
  toSingularCamelCase,
  toSingularPascalCase,
} from "../../lib/stringTransforms";
import { generateModelAggregation } from "../utils/aggregation";

// Generate Zod enum definitions
function generateEnumSchemas(enums: EnumsConfig): string {
  const enumSchemas = Object.entries(enums)
    .map(([enumName, config]) => {
      const values = Object.keys(config)
        .filter((key) => key !== "description")
        .map((v) => `'${v}'`)
        .join(", ");
      const schemaName = `${toCamelCase(enumName)}Schema`;
      return `export const ${schemaName} = z.enum([${values}]);`;
    })
    .join("\n");

  return enumSchemas + "\n\n";
}

// Generate base Zod field type (core type logic without modifiers)
function generateBaseZodType(
  columnConfig: ColumnConfig,
  enums: EnumsConfig,
): string {
  const { type, length } = columnConfig.dbConstraints;
  const validation = columnConfig.validation || {};

  let zodType = "";

  switch (type) {
    case "varchar":
    case "text":
      if (validation.email) {
        zodType = "z.email()";
        if (validation.max || length)
          zodType += `.max(${validation.max || length})`;
        if (validation.min) zodType += `.min(${validation.min})`;
      } else if (validation.url) {
        zodType = "z.url()";
        if (validation.max || length)
          zodType += `.max(${validation.max || length})`;
        if (validation.min) zodType += `.min(${validation.min})`;
      } else {
        zodType = "z.string()";
        if (validation.min) zodType += `.min(${validation.min})`;
        if (validation.max || length)
          zodType += `.max(${validation.max || length})`;
        if (validation.pattern) zodType += `.regex(/${validation.pattern}/)`;
      }
      break;

    case "integer":
    case "serial":
      zodType = "z.number().int()";
      if (validation.min) zodType += `.min(${validation.min})`;
      if (validation.max) zodType += `.max(${validation.max})`;
      break;

    case "numeric":
    case "decimal":
    case "money":
      // Use string for Drizzle compatibility (numeric fields expect strings)
      zodType = "z.string().regex(/^\\d+\\.\\d{2}$/, 'Invalid price format')";
      break;

    case "timestamp":
    case "date":
      zodType = "z.date()";
      if (validation.min) zodType += `.min(new Date('${validation.min}'))`;
      if (validation.max) zodType += `.max(new Date('${validation.max}'))`;
      break;

    case "boolean":
      zodType = "z.boolean()";
      break;

    case "geography":
      // Simplified - treating as string for now
      zodType = "z.string()";
      if (validation.pattern) zodType += `.regex(/${validation.pattern}/)`;
      break;

    default:
      // Check if it's an enum
      const enumKey = Object.keys(enums).find(
        (key) => key === type || key === `${type}_enum`,
      );
      if (enumKey) {
        zodType = `${toCamelCase(enumKey)}Schema`;
      } else {
        zodType = "z.string()";
        if (validation.pattern) zodType += `.regex(/${validation.pattern}/)`;
      }
  }

  return zodType;
}

// Add default value to Zod type if specified
function addDefaultValue(zodType: string, columnConfig: ColumnConfig): string {
  const { type, default: defaultValue } = columnConfig.dbConstraints;

  if (
    defaultValue !== undefined &&
    type !== "serial" &&
    defaultValue !== "now()"
  ) {
    if (typeof defaultValue === "string") {
      zodType += `.default("${defaultValue}")`;
    } else if (typeof defaultValue === "boolean") {
      zodType += `.default(${defaultValue})`;
    } else if (type === "numeric" || type === "decimal" || type === "money") {
      // Numeric types need string defaults for Drizzle compatibility
      zodType += `.default("${defaultValue}.00")`;
    } else {
      zodType += `.default(${defaultValue})`;
    }
  }

  return zodType;
}

// Generate complete field definition for base schema
function generateBaseSchemaField(
  columnName: string,
  columnConfig: ColumnConfig,
  enums: EnumsConfig,
): string {
  const { nullable, primaryKey } = columnConfig.dbConstraints;
  const validation = columnConfig.validation || {};
  const fieldKey = toCamelCase(columnName);

  let zodType = generateBaseZodType(columnConfig, enums);
  zodType = addDefaultValue(zodType, columnConfig);

  // Handle nullable and optional for base schema
  if (nullable) {
    zodType += ".nullable()";
  }

  // Only make fields optional if explicitly marked as not required
  if (validation.required === false && !nullable && !primaryKey) {
    zodType += ".optional()";
  }

  return `  ${fieldKey}: ${zodType}`;
}

// Generate base table schema (foundation for all other schemas)
function generateTableSchema(table: TableConfig, enums: EnumsConfig): string {
  const schemaName = `${toSingularPascalCase(table.tableName)}Schema`;

  const columns = Object.entries(table.columns)
    .map(([columnName, columnConfig]) =>
      generateBaseSchemaField(columnName, columnConfig, enums),
    )
    .join(",\n");

  return `export const ${schemaName} = z.object({\n${columns}\n});`;
}

// Generate field modifications for Insert schema
function generateInsertFieldModifications(
  table: TableConfig,
  enums: EnumsConfig,
): string {
  const modifications: string[] = [];

  // Find fields that need different behavior in Insert schema vs Base schema
  Object.entries(table.columns).forEach(([columnName, columnConfig]) => {
    const {
      type,
      nullable,
      primaryKey,
      default: defaultValue,
    } = columnConfig.dbConstraints;
    const validation = columnConfig.validation || {};
    const fieldKey = toCamelCase(columnName);

    // Skip auto-generated fields (they won't be in Insert schema)
    if (type === "serial" || defaultValue === "now()") {
      return;
    }

    const hasDefault = defaultValue !== undefined;

    // For Insert schemas, convert nullable fields to optional
    // Also convert fields with defaults to optional
    if (nullable || hasDefault || validation.required === false) {
      let zodType = generateBaseZodType(columnConfig, enums);
      zodType = addDefaultValue(zodType, columnConfig);
      zodType += ".optional()";
      modifications.push(`    ${fieldKey}: ${zodType}`);
    }
  });

  return modifications.length > 0 ? modifications.join(",\n") : "";
}

// Generate Insert schema using inheritance from base schema
function generateInsertSchema(table: TableConfig, enums: EnumsConfig): string {
  const baseSchemaName = `${toSingularPascalCase(table.tableName)}Schema`;
  const schemaName = `${toSingularPascalCase(table.tableName)}InsertSchema`;

  // Identify auto-generated fields to omit
  const autoGeneratedFields: string[] = [];
  Object.entries(table.columns).forEach(([columnName, columnConfig]) => {
    const { type, default: defaultValue } = columnConfig.dbConstraints;
    if (type === "serial" || defaultValue === "now()") {
      autoGeneratedFields.push(toCamelCase(columnName));
    }
  });

  const modifications = generateInsertFieldModifications(table, enums);

  if (autoGeneratedFields.length === 0 && !modifications) {
    // No modifications needed, use base schema as-is
    return `export const ${schemaName} = ${baseSchemaName};`;
  }

  let schemaDefinition = `${baseSchemaName}`;

  if (autoGeneratedFields.length > 0) {
    const omittedFields = autoGeneratedFields
      .map((field) => `${field}: true`)
      .join(", ");
    schemaDefinition += `.omit({ ${omittedFields} })`;
  }

  if (modifications) {
    schemaDefinition += `.extend({\n${modifications}\n  })`;
  }

  return `export const ${schemaName} = ${schemaDefinition};`;
}

// Generate Update schema using inheritance (all fields optional except ID)
function generateUpdateSchema(table: TableConfig, enums: EnumsConfig): string {
  const insertSchemaName = `${toSingularPascalCase(table.tableName)}InsertSchema`;
  const schemaName = `${toSingularPascalCase(table.tableName)}UpdateSchema`;

  // Find primary key field to keep required
  const primaryKeyField = Object.entries(table.columns).find(
    ([_, columnConfig]) =>
      columnConfig.dbConstraints.primaryKey ||
      columnConfig.dbConstraints.type === "serial",
  );

  if (!primaryKeyField) {
    // No primary key, just make all insert fields optional
    return `export const ${schemaName} = ${insertSchemaName}.partial();`;
  }

  const [primaryKeyColumnName, primaryKeyConfig] = primaryKeyField;
  const primaryKeyFieldName = toCamelCase(primaryKeyColumnName);

  // Generate the primary key field definition
  let primaryKeyType = generateBaseZodType(primaryKeyConfig, enums);

  return `export const ${schemaName} = ${insertSchemaName}.partial().extend({
  ${primaryKeyFieldName}: ${primaryKeyType}
});`;
}

// Generate complete validation file for a table
async function generateTableValidation(
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
    `Zod validation schemas for ${table.tableName} table`,
  );

  // Analyze what enum imports are needed
  const usedEnums = Object.values(table.columns)
    .map((col) => col.dbConstraints.type)
    .filter(
      (type) =>
        Object.keys(enums).includes(type) ||
        Object.keys(enums).includes(`${type}_enum`),
    )
    .filter((type, index, arr) => arr.indexOf(type) === index); // unique

  // Generate imports
  const imports: Record<string, string[]> = {
    zod: ["z"],
  };

  content += generateImports(imports);

  // Import enum schemas if needed
  if (usedEnums.length > 0) {
    content += "// Enum schema imports\n";
    usedEnums.forEach((enumType) => {
      const enumKey = Object.keys(enums).find(
        (key) => key === enumType || key === `${enumType}_enum`,
      );
      if (enumKey) {
        content += `import { ${toCamelCase(
          enumKey,
        )}Schema } from '../enums';\n`;
      }
    });
    content += "\n";
  }

  // Generate schemas
  content += "// Base table schema\n";
  content += generateTableSchema(table, enums) + "\n\n";

  content += "// Insert schema (for creating new records)\n";
  content += generateInsertSchema(table, enums) + "\n\n";

  content += "// Update schema (for updating existing records)\n";
  content += generateUpdateSchema(table, enums) + "\n\n";

  // INNOVATION: Generate TypeScript types from schemas immediately (single source of truth)
  const tableName = toSingularPascalCase(table.tableName);
  content += "// TypeScript types (inferred from schemas above)\n";
  content += `export type ${tableName} = z.infer<typeof ${tableName}Schema>;\n`;
  content += `export type ${tableName}Insert = z.infer<typeof ${tableName}InsertSchema>;\n`;
  content += `export type ${tableName}Update = z.infer<typeof ${tableName}UpdateSchema>;\n`;

  return content;
}

// Generate enums validation file
async function generateEnumsValidation(enums: EnumsConfig): Promise<void> {
  let content = generateFileHeader("Zod enum validation schemas");

  const imports = {
    zod: ["z"],
  };

  content += generateImports(imports);
  content += generateEnumSchemas(enums);

  // Generate TypeScript types for enums (inferred from schemas)
  content += "// TypeScript types (inferred from schemas above)\n";
  Object.entries(enums).forEach(([enumName, _]) => {
    const schemaName = `${toCamelCase(enumName)}Schema`;
    const typeName = toPascalCase(enumName);
    content += `export type ${typeName} = z.infer<typeof ${schemaName}>;\n`;
  });

  await writeAndFormatFile("./src/models/enums/validation.ts", content);
}

// Main generation function
async function generateZodSchemas(): Promise<void> {
  try {
    console.log("Generating Zod validation schemas from JSON configuration...");

    const enums = await loadEnums();
    const tables = await loadAllTables();

    console.log(
      `Found ${Object.keys(enums).length} enums and ${tables.length} tables`,
    );

    // Generate enums validation file
    await generateEnumsValidation(enums);

    // Generate table validation schemas
    for (const table of tables) {
      const content = await generateTableValidation(table, enums);
      const fileName = toSingularCamelCase(table.tableName);
      await writeAndFormatFile(
        `./src/models/${fileName}/validation.ts`,
        content,
      );
    }

    // Generate aggregation files
    await generateModelAggregation(tables, "validation");

    console.log(
      "✅ Zod validation schemas and aggregation generated successfully!",
    );
  } catch (error) {
    console.error("❌ Error generating Zod validation schemas:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateZodSchemas();
}

export { generateZodSchemas };
