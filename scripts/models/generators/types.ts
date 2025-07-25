#!/usr/bin/env tsx

import { EnumsConfig, TableConfig } from "../../lib/config";
import {
  writeAndFormatFile,
  loadEnums,
  loadAllTables,
} from "../../lib/fileSystem";
import { generateFileHeader, validateTableConfig } from "../../lib/template";
import {
  toCamelCase,
  toPascalCase,
  toSingularCamelCase,
  toSingularPascalCase,
} from "../../lib/stringTransforms";
import { generateModelAggregation } from "../utils/aggregation";

// Generate API request/response types
function generateApiTypes(table: TableConfig): string {
  const baseName = toSingularPascalCase(table.tableName);

  const apiTypes = [
    // List API response
    `export interface ${toPascalCase(table.tableName)}ListResponse {
  data: ${baseName}[];
  total: number;
  page: number;
  limit: number;
}`,

    // Single item API response
    `export interface ${baseName}Response {
  data: ${baseName};
}`,

    // Create API request
    `export interface ${baseName}CreateRequest {
  data: ${baseName}Insert;
}`,

    // Update API request
    `export interface ${baseName}UpdateRequest {
  data: ${baseName}Update;
}`,

    // Delete API response
    `export interface ${baseName}DeleteResponse {
  success: boolean;
  message?: string;
}`,
  ];

  return apiTypes.join("\n\n");
}

// Generate foreign key relation types based on actual foreign keys in columns
function generateForeignKeyRelations(table: TableConfig): {
  relations: string[];
  imports: string[];
} {
  const relations: string[] = [];
  const imports: string[] = [];

  // Get foreign key references from columns
  Object.entries(table.columns).forEach(([columnName, columnConfig]) => {
    const references = columnConfig.dbConstraints.references;
    if (references) {
      // Use model name, not column name
      const relationName = toSingularCamelCase(references.table);
      const relatedType = toSingularPascalCase(references.table);
      const fileName = toSingularCamelCase(references.table);

      relations.push(`  ${relationName}?: ${relatedType};`);
      if (!imports.includes(relatedType)) {
        imports.push(`import type { ${relatedType} } from '../${fileName}';`);
      }
    }
  });

  return { relations, imports };
}

// Generate reverse relationship types (for tables that are referenced by this table)
function generateReverseRelations(
  table: TableConfig,
  allTables: TableConfig[],
): { relations: string[]; imports: string[] } {
  const relations: string[] = [];
  const imports: string[] = [];
  const currentTableName = table.tableName;

  // Find tables that reference this table
  allTables.forEach((otherTable) => {
    if (otherTable.tableName === currentTableName) return;

    Object.entries(otherTable.columns).forEach(([columnName, columnConfig]) => {
      const references = columnConfig.dbConstraints.references;
      if (references && references.table === currentTableName) {
        // Generate a better relation name
        const tableName = toCamelCase(otherTable.tableName);
        const relationName = tableName.endsWith("s")
          ? tableName
          : `${tableName}s`; // Pluralize
        const relatedType = toSingularPascalCase(otherTable.tableName);
        const fileName = toSingularCamelCase(otherTable.tableName);

        relations.push(`  ${relationName}?: ${relatedType}[];`);
        if (!imports.includes(relatedType)) {
          imports.push(`import type { ${relatedType} } from '../${fileName}';`);
        }
      }
    });
  });

  return { relations, imports };
}

// Generate comprehensive relationship types
function generateRelationshipTypes(
  table: TableConfig,
  allTables: TableConfig[],
): string {
  const baseName = toSingularPascalCase(table.tableName);

  // Get foreign key relations (belongs to)
  const fkRelations = generateForeignKeyRelations(table);

  // Get reverse relations (has many)
  const reverseRelations = generateReverseRelations(table, allTables);

  // Combine all relations
  const allRelations = [
    ...fkRelations.relations,
    ...reverseRelations.relations,
  ];
  const allImports = [...fkRelations.imports, ...reverseRelations.imports];

  if (allRelations.length === 0) {
    return "";
  }

  // Generate WithRelations type
  const withRelationsType = `export interface ${baseName}WithRelations extends ${baseName} {\n${allRelations.join(
    "\n",
  )}\n}`;

  // Generate specific relation combinations for common use cases
  const specificTypes: string[] = [];

  // Generate individual relation types (e.g., BookingWithGuest)
  fkRelations.relations.forEach((relation) => {
    const relationName = relation.split(":")[0].trim();
    const relationTypeName = relationName.replace("?", "").split(" ")[0];
    const specificTypeName = `${baseName}With${toPascalCase(relationTypeName)}`;
    const requiredRelation = relation.replace("?", ""); // Make required
    specificTypes.push(
      `export interface ${specificTypeName} extends ${baseName} {\n  ${requiredRelation}\n}`,
    );
  });

  const result = [withRelationsType, ...specificTypes].join("\n\n");

  return `\n// Relationship types\n${result}`;
}

// Generate complete types file for a table (EXTENSION LAYER)
async function generateTableTypes(
  table: TableConfig,
  enums: EnumsConfig,
  allTables: TableConfig[],
): Promise<string> {
  const errors = validateTableConfig(table);
  if (errors.length > 0) {
    throw new Error(
      `Invalid table configuration for ${table.tableName}: ${errors.join(", ")}`,
    );
  }

  const baseName = toSingularPascalCase(table.tableName);

  let content = generateFileHeader(
    `TypeScript extension types for ${table.tableName} table`,
  );

  // Import base types from validation.ts (single source of truth)
  content += "// Import base types from validation schemas\n";
  content += `import type { ${baseName}, ${baseName}Insert, ${baseName}Update } from './validation';\n\n`;

  // Generate relation imports
  const fkRelations = generateForeignKeyRelations(table);
  const reverseRelations = generateReverseRelations(table, allTables);
  const allRelationImports = [
    ...fkRelations.imports,
    ...reverseRelations.imports,
  ].filter((imp, index, arr) => arr.indexOf(imp) === index); // unique

  if (allRelationImports.length > 0) {
    content += "// Related table type imports\n";
    content += allRelationImports.join("\n") + "\n\n";
  }

  // Re-export base types for compatibility (maintains existing import paths)
  content += "// Re-export base types for compatibility\n";
  content += `export type { ${baseName}, ${baseName}Insert, ${baseName}Update } from './validation';\n\n`;

  // Generate API types (structured responses for endpoints)
  content += "// API request/response types\n";
  content += generateApiTypes(table) + "\n";

  // Generate relationship types (only when relationships exist)
  const relationshipTypes = generateRelationshipTypes(table, allTables);
  if (relationshipTypes) {
    content += relationshipTypes + "\n";
  }

  return content;
}

// Generate enums types file (focused on metadata only)
async function generateEnumsTypes(enums: EnumsConfig): Promise<void> {
  let content = generateFileHeader("TypeScript enum extension types");

  // Re-export base enum types for compatibility
  content += "// Re-export base enum types from validation schemas\n";
  Object.entries(enums).forEach(([enumName, _]) => {
    const typeName = toPascalCase(enumName);
    content += `export type { ${typeName} } from './validation';\n`;
  });
  content += "\n";

  await writeAndFormatFile("./src/models/enums/types.ts", content);
}

// Generate utility types
async function generateUtilityTypes(): Promise<void> {
  let content = generateFileHeader("Utility types for database operations");

  content += `// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Generic list response
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Generic pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Generic filter parameters
export interface FilterParams {
  search?: string;
  [key: string]: unknown;
}

// Generic query parameters combining pagination and filters
export interface QueryParams extends PaginationParams, FilterParams {}

// Database entity base interface
export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

// Form validation state
export interface ValidationState {
  isValid: boolean;
  errors: Record<string, string[]>;
}

// API error response
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}
`;

  await writeAndFormatFile("./src/models/utils/types.ts", content);
}

// Main generation function
async function generateTypeScriptTypes(): Promise<void> {
  try {
    console.log(
      "Generating TypeScript extension types from JSON configuration...",
    );

    const enums = await loadEnums();
    const tables = await loadAllTables();

    console.log(
      `Found ${Object.keys(enums).length} enums and ${tables.length} tables`,
    );

    // Generate enums types file (extension layer)
    await generateEnumsTypes(enums);

    // Generate utility types
    await generateUtilityTypes();

    // Generate table types (extension layer)
    for (const table of tables) {
      const content = await generateTableTypes(table, enums, tables);
      const fileName = toSingularCamelCase(table.tableName);
      await writeAndFormatFile(`./src/models/${fileName}/types.ts`, content);
    }

    // Generate aggregation files
    await generateModelAggregation(tables, "types");

    console.log(
      "✅ TypeScript extension types and aggregation generated successfully!",
    );
  } catch (error) {
    console.error("❌ Error generating TypeScript extension types:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTypeScriptTypes();
}

export { generateTypeScriptTypes };
