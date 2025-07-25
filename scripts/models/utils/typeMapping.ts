// Database type to target language mapping utilities

import { ColumnConfig } from "../../lib/config";

// Drizzle type mapping
export function mapToDrizzleType(columnConfig: ColumnConfig): string {
  const {
    type,
    length,
    precision,
    scale,
    nullable,
    default: defaultValue,
    primaryKey,
    unique,
  } = columnConfig.dbConstraints;

  let drizzleType = "";

  switch (type) {
    case "varchar":
      drizzleType = length ? `varchar(${length})` : "varchar(255)";
      break;
    case "text":
      drizzleType = "text()";
      break;
    case "integer":
      drizzleType = "integer()";
      break;
    case "serial":
      drizzleType = "integer().primaryKey().generatedAlwaysAsIdentity()";
      break;
    case "numeric":
    case "decimal":
      drizzleType =
        precision && scale ? `numeric(${precision}, ${scale})` : "numeric()";
      break;
    case "money":
      drizzleType = "numeric(10, 2)";
      break;
    case "timestamp":
      drizzleType = "timestamp({ mode: 'date' })";
      break;
    case "date":
      drizzleType = "date({ mode: 'date' })";
      break;
    case "boolean":
      drizzleType = "boolean()";
      break;
    case "enum":
      // Handle enum references - will be handled by the generator
      drizzleType = `${type}Ref`; // Placeholder
      break;
    case "geography":
      drizzleType = "text()"; // Simplified for now
      break;
    default:
      drizzleType = "text()";
  }

  // Add constraints
  const constraints: string[] = [];

  if (!nullable && type !== "serial") {
    constraints.push(".notNull()");
  }

  if (defaultValue !== undefined && type !== "serial") {
    if (typeof defaultValue === "string") {
      constraints.push(`.default('${defaultValue}')`);
    } else if (typeof defaultValue === "boolean") {
      constraints.push(`.default(${defaultValue})`);
    } else {
      constraints.push(`.default(${defaultValue})`);
    }
  }

  if (unique && type !== "serial") {
    constraints.push(".unique()");
  }

  if (primaryKey && type !== "serial") {
    constraints.push(".primaryKey()");
  }

  return drizzleType + constraints.join("");
}

// Zod type mapping
export function mapToZodType(columnConfig: ColumnConfig): string {
  const { type, length, precision, scale, nullable } =
    columnConfig.dbConstraints;
  const validation = columnConfig.validation || {};

  let zodType = "";

  switch (type) {
    case "varchar":
    case "text":
      zodType = "z.string()";
      if (validation.min) zodType += `.min(${validation.min})`;
      if (validation.max || length)
        zodType += `.max(${validation.max || length})`;
      if (validation.email) zodType += ".email()";
      if (validation.url) zodType += ".url()";
      if (validation.pattern) zodType += `.regex(/${validation.pattern}/)`;
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
      zodType = "z.number()";
      if (validation.min) zodType += `.min(${validation.min})`;
      if (validation.max) zodType += `.max(${validation.max})`;
      break;
    case "timestamp":
    case "date":
      zodType = "z.date()";
      break;
    case "boolean":
      zodType = "z.boolean()";
      break;
    case "enum":
      // Will be handled by generator with enum values
      zodType = "z.enum([])"; // Placeholder
      break;
    default:
      zodType = "z.string()";
  }

  if (nullable) {
    zodType += ".nullable()";
  }

  if (!validation.required && !nullable) {
    zodType += ".optional()";
  }

  return zodType;
}

// TypeScript type mapping
export function mapToTSType(columnConfig: ColumnConfig): string {
  const { type, nullable } = columnConfig.dbConstraints;

  let tsType = "";

  switch (type) {
    case "varchar":
    case "text":
      tsType = "string";
      break;
    case "integer":
    case "serial":
    case "numeric":
    case "decimal":
    case "money":
      tsType = "number";
      break;
    case "timestamp":
    case "date":
      tsType = "Date";
      break;
    case "boolean":
      tsType = "boolean";
      break;
    case "enum":
      tsType = "string"; // Will be refined by generator
      break;
    default:
      tsType = "string";
  }

  if (nullable) {
    tsType += " | null";
  }

  return tsType;
}
