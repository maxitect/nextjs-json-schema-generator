/**
 * UI-specific database to form field mapping utilities
 * Maps database types and constraints to appropriate form field types
 */

import { ColumnConfig } from "../../lib/config";

// Type definition for field properties
export interface FieldProps {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string;
}

// Map database types to form field types
export function mapToFormFieldType(columnConfig: ColumnConfig): string {
  const { type, references } = columnConfig.dbConstraints;
  const ui = columnConfig.ui || {};
  const validation = columnConfig.validation || {};

  // Check UI format first (highest priority)
  if (ui.format) {
    switch (ui.format) {
      case "email":
        return "email";
      case "phone":
        return "tel";
      case "date":
        return "date";
      case "datetime":
        return "datetime-local";
      case "currency":
        return "number";
      case "password":
        return "password";
      case "url":
        return "url";
      case "color":
        return "color";
      case "range":
        return "range";
      default:
        break;
    }
  }

  // Check validation hints (secondary priority)
  if (validation.email) return "email";
  if (validation.url) return "url";

  // Map by database type (default mapping)
  switch (type) {
    case "integer":
    case "serial":
    case "numeric":
    case "decimal":
    case "money":
      return "number";
    case "boolean":
      return "checkbox";
    case "text":
      // Use textarea for large text fields
      return ui.multiline !== false ? "textarea" : "text";
    case "date":
      return "date";
    case "timestamp":
      return "datetime-local";
    case "varchar":
    default:
      // Foreign key relationships become select dropdowns
      if (references) return "select";

      // Check for common field patterns
      const fieldName = columnConfig.name?.toLowerCase() || "";
      if (fieldName.includes("email")) return "email";
      if (fieldName.includes("phone")) return "tel";
      if (fieldName.includes("url") || fieldName.includes("website"))
        return "url";
      if (fieldName.includes("password")) return "password";

      return "text";
  }
}

// Generate validation object for FormField component
export function generateValidationObject(validation: object): string {
  if (!validation || Object.keys(validation).length === 0) return "undefined";

  const rules: string[] = [];

  Object.entries(validation).forEach(([key, value]) => {
    switch (key) {
      case "required":
        if (typeof value === "string") {
          rules.push(`required: "${value}"`);
        } else {
          rules.push(`required: ${value ? "true" : "false"}`);
        }
        break;
      case "min":
        rules.push(
          `min: { value: ${value}, message: "Minimum value is ${value}" }`,
        );
        break;
      case "max":
        rules.push(
          `max: { value: ${value}, message: "Maximum value is ${value}" }`,
        );
        break;
      case "minLength":
        rules.push(
          `minLength: { value: ${value}, message: "Minimum length is ${value} characters" }`,
        );
        break;
      case "maxLength":
        rules.push(
          `maxLength: { value: ${value}, message: "Maximum length is ${value} characters" }`,
        );
        break;
      case "email":
        rules.push(
          `email: { value: true, message: "Please enter a valid email address" }`,
        );
        break;
      case "url":
        rules.push(`url: { value: true, message: "Please enter a valid URL" }`);
        break;
      case "pattern":
        rules.push(
          `pattern: { value: /${value}/, message: "Please enter a valid format" }`,
        );
        break;
      case "custom":
        if (
          typeof value === "object" &&
          value &&
          "validate" in value &&
          "message" in value
        ) {
          const customValue = value as { validate: unknown; message: unknown };
          rules.push(
            `validate: { custom: (value) => ${customValue.validate} || "${customValue.message}" }`,
          );
        }
        break;
    }
  });

  return rules.length > 0 ? `{ ${rules.join(", ")} }` : "undefined";
}

// Determine field props based on database configuration
export function generateFieldProps(
  columnName: string,
  columnConfig: ColumnConfig,
): {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string;
} {
  const { nullable, primaryKey } = columnConfig.dbConstraints;
  const ui = columnConfig.ui || {};
  const validation = columnConfig.validation || {};

  const fieldKey = columnName.replace(/_([a-z])/g, (_, letter) =>
    letter.toUpperCase(),
  );
  const fieldType = mapToFormFieldType(columnConfig);
  const isRequired = validation.required && !nullable && !primaryKey;

  // Generate human-readable label
  let label =
    ui.label ||
    columnName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  // Add required indicator to label
  if (isRequired) {
    label += " *";
  }

  const fieldProps: FieldProps = {
    name: fieldKey,
    label,
    type: fieldType,
    required: !!isRequired,
  };

  // Add placeholder if specified
  if (ui.placeholder) {
    fieldProps.placeholder = ui.placeholder;
  } else if (fieldType === "email") {
    fieldProps.placeholder = "Enter your email address";
  } else if (fieldType === "tel") {
    fieldProps.placeholder = "Enter your phone number";
  } else if (fieldType === "url") {
    fieldProps.placeholder = "https://example.com";
  }

  // Add help text if specified
  if (ui.helpText) {
    fieldProps.helpText = ui.helpText;
  }

  // Generate options for select fields (foreign keys)
  if (fieldType === "select" && columnConfig.dbConstraints.references) {
    const refTable = columnConfig.dbConstraints.references.table;
    fieldProps.options = `${refTable}Options`; // Will be populated by parent component
  }

  return fieldProps;
}

// Map database constraints to HTML input attributes
export function mapConstraintsToInputAttributes(columnConfig: ColumnConfig): {
  [key: string]: string | number | boolean;
} {
  const { type, length } = columnConfig.dbConstraints;
  const validation = columnConfig.validation || {};
  const attributes: { [key: string]: string | number | boolean } = {};

  // Set max length for text inputs
  if ((type === "varchar" || type === "text") && length) {
    attributes.maxLength = length;
  }

  // Set min/max for numeric inputs
  if (validation.min !== undefined) {
    attributes.min = validation.min;
  }
  if (validation.max !== undefined) {
    attributes.max = validation.max;
  }

  // Set step for numeric inputs
  if (type === "money" || type === "decimal") {
    attributes.step = "0.01";
  } else if (type === "integer") {
    attributes.step = "1";
  }

  // Set pattern for specific formats
  if (validation.pattern) {
    attributes.pattern = validation.pattern;
  }

  return attributes;
}
