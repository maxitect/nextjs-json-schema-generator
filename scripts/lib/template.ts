import { EnumsConfig, TableConfig } from "./config";

// Template generation utilities
export function generateFileHeader(description: string): string {
  return `// ${description}
// This file is auto-generated. Do not edit manually.
// Generated at: ${new Date().toISOString()}

`;
}

export function generateImports(imports: Record<string, string[]>): string {
  return (
    Object.entries(imports)
      .map(([from, items]) => `import { ${items.join(", ")} } from '${from}';`)
      .join("\n") + "\n\n"
  );
}

export function validateTableConfig(table: TableConfig): string[] {
  const errors: string[] = [];

  if (!table.tableName) {
    errors.push("Table must have a tableName");
  }

  if (!table.columns || Object.keys(table.columns).length === 0) {
    errors.push("Table must have at least one column");
  }

  // Check for primary key
  const hasPrimaryKey = Object.values(table.columns).some(
    (col) =>
      col.dbConstraints.primaryKey || col.dbConstraints.type === "serial",
  );

  if (!hasPrimaryKey) {
    errors.push("Table must have a primary key");
  }

  return errors;
}
