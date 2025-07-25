// TypeScript interfaces for validating JSON schema configuration files
// This file defines the structure for our JSON-driven schema system

export interface EnumConfig {
  values: string[];
  labels?: Record<string, string>;
  colors?: Record<string, string>;
  icons?: Record<string, string>;
  description?: string;
}

export interface EnumsConfig {
  [enumName: string]: EnumConfig;
}

export interface ColumnValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
  custom?: string[];
}

export interface ColumnUI {
  label?: string;
  placeholder?: string;
  helpText?: string;
  section?: string;
  order?: number;
  hidden?: boolean;
  readonly?: boolean;
  format?:
    | "currency"
    | "date"
    | "datetime"
    | "time"
    | "phone"
    | "email"
    | "password"
    | "url"
    | "color"
    | "range";
  prefix?: string;
  suffix?: string;
  multiline?: boolean;
}

export interface ColumnConstraints {
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
  default?: number | string | boolean | null;
  primaryKey?: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: "cascade" | "set null" | "restrict";
    onUpdate?: "cascade" | "set null" | "restrict";
  };
}

export interface ColumnConfig {
  name?: string;
  dbConstraints: ColumnConstraints;
  validation?: ColumnValidation;
  ui?: ColumnUI;
}

export interface IndexConfig {
  columns: string[];
  unique?: boolean;
  type?: "btree" | "hash" | "gist" | "gin";
  where?: string;
}

export interface RelationshipConfig {
  type: "one-to-one" | "one-to-many" | "many-to-many";
  table: string;
  foreignKey?: string;
  localKey?: string;
  pivotTable?: string;
  through?: string;
}

export interface TableConfig {
  tableName: string;
  displayName: string;
  icon?: string;
  description?: string;
  seedData?: Record<string, unknown>[];
  columns: Record<string, ColumnConfig>;
  indexes?: Record<string, IndexConfig>;
  relationships?: Record<string, RelationshipConfig>;
  ui?: {
    listFields?: string[];
    searchFields?: string[];
    sortField?: string;
    sortOrder?: "asc" | "desc";
  };
}

export interface RelationshipsConfig {
  [tableName: string]: Record<string, RelationshipConfig>;
}

export interface IndexesConfig {
  [tableName: string]: Record<string, IndexConfig>;
}
