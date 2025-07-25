#!/usr/bin/env tsx

import { TableConfig } from "../../lib/config";
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

// Generate table component using DataTable with inline default export
function generateTableComponent(table: TableConfig): string {
  const componentName = `${toSingularPascalCase(table.tableName)}Table`;
  const componentInterface = `${toSingularPascalCase(
    table.tableName,
  )}TableProps`;
  const typeName = toSingularPascalCase(table.tableName);

  const ui = table.ui || {};
  const listFields = ui.listFields || Object.keys(table.columns).slice(0, 6);
  const searchFields = ui.searchFields || [];
  const sortField = ui.sortField || "id";
  const sortOrder = ui.sortOrder || "asc";

  // Generate column definitions
  const columnDefs = listFields
    .map((field) => {
      const columnConfig = table.columns[field];
      const label = columnConfig?.ui?.label || toPascalCase(field);
      const fieldName = toCamelCase(field);
      const format = columnConfig?.ui?.format;
      const prefix = columnConfig?.ui?.prefix;
      const suffix = columnConfig?.ui?.suffix;

      // Map UI format to DataTable formatter
      let formatter = "undefined";
      if (format === "currency") formatter = '"currency"';
      else if (format === "date") formatter = '"date"';
      else if (format === "datetime") formatter = '"datetime"';
      else if (columnConfig?.dbConstraints?.type === "boolean")
        formatter = '"boolean"';

      return `    {
      key: "${fieldName}",
      label: "${label}",
      sortable: true,
      ${formatter !== "undefined" ? `formatter: ${formatter},` : ""}
      ${prefix ? `prefix: "${prefix}",` : ""}
      ${suffix ? `suffix: "${suffix}",` : ""}
    }`;
    })
    .join(",\n");

  const searchFieldsArray =
    searchFields.length > 0
      ? `[${searchFields.map((field) => `"${toCamelCase(field)}"`).join(", ")}]`
      : "undefined";

  return `"use client";

import { DataTable, ColumnDef } from "@/components/ui";
import { ${typeName} } from "@/models/${toSingularCamelCase(table.tableName)}";

export interface ${componentInterface} {
  items: ${typeName}[];
  loading?: boolean;
  onEdit?: (item: ${typeName}) => void;
  onDelete?: (item: ${typeName}) => void;
  onView?: (item: ${typeName}) => void;
  className?: string;
}

const columns: ColumnDef<${typeName}>[] = [
${columnDefs}
];

export default function ${componentName}({
  items,
  loading = false,
  onEdit,
  onDelete,
  onView,
  className = "",
}: ${componentInterface}) {
  return (
    <DataTable
      data={items}
      columns={columns}
      ${searchFieldsArray !== "undefined" ? `searchFields={${searchFieldsArray}}` : ""}
      sortField="${toCamelCase(sortField)}"
      sortOrder="${sortOrder}"
      onEdit={onEdit}
      onDelete={onDelete}
      onView={onView}
      loading={loading}
      className={className}
      title="${table.displayName}"
    />
  );
}`;
}

// Generate table for a single table
async function generateTable(table: TableConfig): Promise<void> {
  const errors = validateTableConfig(table);
  if (errors.length > 0) {
    throw new Error(
      `Invalid table configuration for ${table.tableName}: ${errors.join(", ")}`,
    );
  }

  const tableHeader = generateFileHeader(
    `Table component for ${table.tableName} table`,
  );

  const tableContent = tableHeader + generateTableComponent(table);
  const fileName = toSingularCamelCase(table.tableName);
  const componentName = toSingularPascalCase(table.tableName);

  await writeAndFormatFile(
    `./src/components/${fileName}/${componentName}Table.tsx`,
    tableContent,
  );
}

// Main generation function for tables only
async function generateTables(): Promise<void> {
  try {
    console.log("Generating table components from JSON configuration...");

    const enums = await loadEnums();
    const tables = await loadAllTables();

    console.log(
      `Found ${Object.keys(enums).length} enums and ${tables.length} tables`,
    );

    // Generate table components
    for (const table of tables) {
      await generateTable(table);
    }

    console.log("✅ Table components generated successfully!");
  } catch (error) {
    console.error("❌ Error generating table components:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTables();
}

export { generateTables, generateTable };
