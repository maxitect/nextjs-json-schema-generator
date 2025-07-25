#!/usr/bin/env tsx

import { ColumnConfig, EnumsConfig, TableConfig } from "../../lib/config";
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

// Map database types to form field types
function mapToFormFieldType(columnConfig: ColumnConfig): string {
  const { type, references } = columnConfig.dbConstraints;
  const ui = columnConfig.ui || {};
  const validation = columnConfig.validation || {};

  // Check UI format first
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
      default:
        break;
    }
  }

  // Check validation hints
  if (validation.email) return "email";
  if (validation.url) return "url";

  // Map by database type
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
      return "textarea";
    case "date":
      return "date";
    case "timestamp":
      return "datetime-local";
    case "varchar":
    case "text":
    default:
      if (references) return "select"; // Foreign key = select dropdown
      return "text";
  }
}

// Generate validation object for FormField component
function generateValidationObject(validation: object): string {
  if (!validation || Object.keys(validation).length === 0) return "undefined";

  const rules: string[] = [];

  Object.entries(validation).forEach(([k, v]) => {
    switch (k) {
      case "required":
        rules.push(`required: ${typeof v === "string" ? `"${v}"` : "true"}`);
        break;
      case "min":
      case "max":
      case "minLength":
      case "maxLength":
        rules.push(`${k}: ${v}`);
        break;
      case "email":
        rules.push(`email: true`);
        break;
      case "url":
        rules.push(`url: true`);
        break;
      case "pattern":
        rules.push(
          `pattern: { value: /${v}/, message: "Please enter a valid format" }`,
        );
        break;
    }
  });

  return rules.length > 0 ? `{ ${rules.join(", ")} }` : "undefined";
}

// Generate FormField component usage
function generateFormField(
  columnName: string,
  columnConfig: ColumnConfig,
  enums: EnumsConfig,
): string {
  const {
    type,
    nullable,
    references,
    default: defaultValue,
  } = columnConfig.dbConstraints;
  const validation = columnConfig.validation || {};
  const ui = columnConfig.ui || {};

  const fieldName = toCamelCase(columnName);
  const fieldType = mapToFormFieldType(columnConfig);
  const label = ui.label || toPascalCase(fieldName);
  const placeholder = ui.placeholder || `Enter ${label.toLowerCase()}`;
  const helpText = ui.helpText || "";

  // Determine if field is required based on validation, nullability, and default values
  const hasDefault = defaultValue !== undefined && defaultValue !== "now()";
  const required =
    validation.required === true ||
    (validation.required !== false && !nullable && !hasDefault);

  // Check if it's an enum field
  const enumKey = Object.keys(enums).find(
    (key) => key === type || key === `${type}_enum`,
  );

  const validationObj = generateValidationObject(validation);

  let options = "undefined";
  if (enumKey) {
    // Generate enum options from new nested structure
    const enumOptions = Object.keys(enums[enumKey])
      .filter((key) => key !== "description")
      .map((value) => {
        const enumValue = enums[enumKey][value];
        const optionLabel =
          typeof enumValue === "object" ? enumValue.label || value : value;
        return `{ value: "${value}", label: "${optionLabel}" }`;
      })
      .join(", ");
    options = `[${enumOptions}]`;
  } else if (references) {
    // TODO: Generate foreign key options
    options = "[]";
  }

  return `          <FormField
            name="${fieldName}"
            label="${label}"
            type="${fieldType}"
            required={${required}}
            placeholder="${placeholder}"
            ${helpText ? `helpText="${helpText}"` : ""}
            ${options !== "undefined" ? `options={${options}}` : ""}
            ${validationObj !== "undefined" ? `validation={${validationObj}}` : ""}
            register={register}
            errors={errors}
          />`;
}

// Group fields by section
function groupFieldsBySection(
  table: TableConfig,
  enums: EnumsConfig,
): Record<string, string[]> {
  const sections: Record<string, string[]> = {};

  Object.entries(table.columns).forEach(([columnName, columnConfig]) => {
    const ui = columnConfig.ui || {};
    const { type } = columnConfig.dbConstraints;

    // Skip hidden fields, serial IDs, and auto-generated timestamps
    if (
      ui.hidden ||
      type === "serial" ||
      columnConfig.dbConstraints.default === "now()"
    ) {
      return;
    }

    const section = ui.section || "general";
    if (!sections[section]) {
      sections[section] = [];
    }

    const fieldComponent = generateFormField(columnName, columnConfig, enums);
    sections[section].push(fieldComponent);
  });

  return sections;
}

// Generate form component using DaisyUI with inline default export
function generateFormComponent(table: TableConfig, enums: EnumsConfig): string {
  const componentName = `${toSingularPascalCase(table.tableName)}Form`;
  const componentInterface = `${toSingularPascalCase(
    table.tableName,
  )}FormProps`;

  const insertTypeName = `${toSingularPascalCase(table.tableName)}Insert`;
  const updateTypeName = `${toSingularPascalCase(table.tableName)}Update`;
  const validationSchemaName = `${toSingularPascalCase(
    table.tableName,
  )}InsertSchema`;

  const sections = groupFieldsBySection(table, enums);
  const sectionNames = Object.keys(sections);

  // Generate section headers
  const sectionHeaders: Record<string, string> = {
    basic: "Basic Information",
    personal: "Personal Details",
    contact: "Contact Information",
    address: "Address Details",
    dates: "Date Information",
    pricing: "Pricing Details",
    details: "Additional Details",
    status: "Status Information",
    tracking: "Tracking Information",
    metadata: "System Information",
    general: "Form Details",
  };

  const formSections = sectionNames
    .map((sectionName) => {
      const sectionTitle =
        sectionHeaders[sectionName] || toPascalCase(sectionName);
      const fields = sections[sectionName].join("\n");

      return `        <Fieldset legend="${sectionTitle}" columns={2}>
${fields}
        </Fieldset>`;
    })
    .join("\n\n");

  return `"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ${insertTypeName}, ${updateTypeName} } from "@/models/${toSingularCamelCase(
    table.tableName,
  )}";
import { ${validationSchemaName} } from "@/models/${toSingularCamelCase(
    table.tableName,
  )}";
import { FormField, Fieldset, FormActions } from "@/components/ui";

export interface ${componentInterface} {
  mode: "create" | "edit";
  initialData?: ${updateTypeName};
  onSubmit: (data: ${insertTypeName}) => void;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

export default function ${componentName}({
  mode,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  className = "",
}: ${componentInterface}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<${insertTypeName}>({
    resolver: zodResolver(${validationSchemaName}),
    defaultValues: initialData || {},
  });

  const onFormSubmit = (data: ${insertTypeName}) => {
    onSubmit(data);
  };

  const handleReset = () => {
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className={\`max-w-4xl mx-auto space-y-6 \${className}\`} aria-labelledby="form-heading">
      <div className="prose text-center">
        <h2 id="form-heading">
          {mode === "create" ? "Create" : "Edit"} ${table.displayName}
        </h2>
        ${
          table.description
            ? `<p className="text-base-content/70 mt-2">${table.description}</p>`
            : ""
        }
      </div>

${formSections}

      <FormActions
        mode={mode}
        loading={loading || isSubmitting}
        onCancel={onCancel}
        onReset={handleReset}
      />
    </form>
  );
}`;
}

// Generate form for a single table
async function generateForm(
  table: TableConfig,
  enums: EnumsConfig,
): Promise<void> {
  const errors = validateTableConfig(table);
  if (errors.length > 0) {
    throw new Error(
      `Invalid table configuration for ${table.tableName}: ${errors.join(", ")}`,
    );
  }

  const formHeader = generateFileHeader(
    `Form component for ${table.tableName} table`,
  );

  const formContent = formHeader + generateFormComponent(table, enums);
  const fileName = toSingularCamelCase(table.tableName);
  const componentName = toSingularPascalCase(table.tableName);

  await writeAndFormatFile(
    `./src/components/${fileName}/${componentName}Form.tsx`,
    formContent,
  );
}

// Main generation function for forms only
async function generateForms(): Promise<void> {
  try {
    console.log("Generating form components from JSON configuration...");

    const enums = await loadEnums();
    const tables = await loadAllTables();

    console.log(
      `Found ${Object.keys(enums).length} enums and ${tables.length} tables`,
    );

    // Generate form components
    for (const table of tables) {
      await generateForm(table, enums);
    }

    console.log("✅ Form components generated successfully!");
  } catch (error) {
    console.error("❌ Error generating form components:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateForms();
}

export { generateForms, generateForm };
