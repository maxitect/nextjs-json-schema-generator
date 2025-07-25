import { EnumsConfig, TableConfig } from "../../lib/config";

// Schema validation, analysis, and processing utilities

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

// Analyze enum usage within a table configuration
export function analyzeEnumUsage(
  table: TableConfig,
  enums: EnumsConfig,
): {
  usedEnums: string[];
  enumImports: string[];
} {
  const usedEnums = Object.values(table.columns)
    .map((col) => col.dbConstraints.type)
    .filter(
      (type) =>
        Object.keys(enums).includes(type) ||
        Object.keys(enums).includes(`${type}_enum`),
    )
    .filter((type, index, arr) => arr.indexOf(type) === index); // unique

  const enumImports = usedEnums.map((enumType) => {
    const enumKey = Object.keys(enums).find(
      (key) => key === enumType || key === `${enumType}_enum`,
    );
    return enumKey || enumType;
  });

  return { usedEnums, enumImports };
}

// Analyze relationships defined in a table
export function analyzeRelationships(table: TableConfig): {
  foreignKeys: Array<{
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
  hasRelationships: boolean;
} {
  const foreignKeys: Array<{
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
  }> = [];

  Object.entries(table.columns).forEach(([columnName, columnConfig]) => {
    const references = columnConfig.dbConstraints.references;
    if (references) {
      foreignKeys.push({
        columnName,
        referencedTable: references.table,
        referencedColumn: references.column,
      });
    }
  });

  return {
    foreignKeys,
    hasRelationships: foreignKeys.length > 0,
  };
}

// Analyze indexes defined in a table
export function analyzeIndexes(table: TableConfig): {
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
  hasIndexes: boolean;
} {
  const indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }> = [];

  if (table.indexes) {
    Object.entries(table.indexes).forEach(([indexName, indexConfig]) => {
      indexes.push({
        name: indexName,
        columns: indexConfig.columns,
        unique: indexConfig.unique || false,
      });
    });
  }

  return {
    indexes,
    hasIndexes: indexes.length > 0,
  };
}
