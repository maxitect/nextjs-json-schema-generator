#!/usr/bin/env tsx

/**
 * Components stream coordinator
 * Orchestrates generation of form and table components
 */

import { generateForms } from "./generators/forms";
import { generateTables } from "./generators/tables";
import { generateComponentIndex } from "./utils/uiGeneration";
import { loadAllTables } from "../lib/fileSystem";
import { toSingularPascalCase } from "../lib/stringTransforms";

// Generate all component-related files
async function generateComponents(): Promise<void> {
  try {
    console.log("🚀 Starting components generation...");

    // Step 1: Generate form components
    console.log("📝 Generating form components...");
    await generateForms();

    // Step 2: Generate table components
    console.log("📊 Generating table components...");
    await generateTables();

    // Step 3: Generate component index files
    console.log("📦 Generating component index files...");
    await generateComponentIndexes();

    console.log("✅ Components generation completed successfully!");
  } catch (error) {
    console.error("❌ Error in components generation:", error);
    process.exit(1);
  }
}

// Generate index files for all component folders
async function generateComponentIndexes(): Promise<void> {
  const tables = await loadAllTables();

  for (const table of tables) {
    const componentName = toSingularPascalCase(table.tableName);
    const exports = [`${componentName}Form`, `${componentName}Table`];

    await generateComponentIndex(table.tableName, exports);
  }
}

// Generate only forms
async function generateFormsOnly(): Promise<void> {
  try {
    console.log("📝 Generating form components only...");
    await generateForms();
    console.log("✅ Form components generated successfully!");
  } catch (error) {
    console.error("❌ Error generating form components:", error);
    process.exit(1);
  }
}

// Generate only tables
async function generateTablesOnly(): Promise<void> {
  try {
    console.log("📊 Generating table components only...");
    await generateTables();
    console.log("✅ Table components generated successfully!");
  } catch (error) {
    console.error("❌ Error generating table components:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.includes("--forms-only")) {
    generateFormsOnly();
  } else if (args.includes("--tables-only")) {
    generateTablesOnly();
  } else {
    generateComponents();
  }
}

export { generateComponents, generateFormsOnly, generateTablesOnly };
