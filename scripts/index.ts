#!/usr/bin/env tsx

/**
 * Main coordinated generation script
 * Orchestrates the generation of models and components using the new stream architecture
 */

import { generateModels } from "./models";
import { generateComponents } from "./components";
import { generateDatabase } from "./db";
import { loadEnums, loadAllTables } from "./lib/fileSystem";
import {
  generateModelIndex,
  generateEnumsIndex,
  generateUtilsIndex,
} from "./models/utils/indexGeneration";

// Generate all model index files with complete exports
async function generateAllModelIndexes(): Promise<void> {
  const tables = await loadAllTables();

  // Generate complete index files for each model
  for (const table of tables) {
    await generateModelIndex(table, ["types", "schema", "validation"]);
  }

  // Generate complete enums index
  await generateEnumsIndex(["types", "schema", "validation"]);

  // Generate utils index
  await generateUtilsIndex(["types"]);
}

// Main coordinated generation function
async function generateAll(): Promise<void> {
  try {
    console.log(
      "🚀 Starting coordinated schema generation with new architecture...",
    );

    const enums = await loadEnums();
    const tables = await loadAllTables();

    console.log(
      `Found ${Object.keys(enums).length} enums and ${tables.length} tables`,
    );

    // Generate models stream (validation → types → schemas)
    console.log("\n🔧 Generating models stream...");
    await generateModels();

    // Generate components stream (forms + tables)
    console.log("\n⚛️  Generating components stream...");
    await generateComponents();

    // Generate database utilities
    console.log("\n🗄️  Generating database utilities...");
    await generateDatabase();

    console.log("\n📦 Generating final index files...");
    await generateAllModelIndexes();

    console.log("\n🎉 All schemas and components generated successfully!");
    console.log("\n📁 New refactored structure:");
    console.log("  scripts/");
    console.log("    ├── lib/                    # Shared utilities");
    console.log("    │   ├── config.ts");
    console.log("    │   ├── fileSystem.ts");
    console.log("    │   ├── stringTransforms.ts");
    console.log("    │   └── template.ts");
    console.log("    ├── models/                 # Models generation stream");
    console.log("    │   ├── generators/");
    console.log(
      "    │   │   ├── validation.ts   # Zod schemas + inferred types",
    );
    console.log(
      "    │   │   ├── types.ts        # Extension layer (API, relationships)",
    );
    console.log("    │   │   └── schemas.ts      # Drizzle schemas");
    console.log("    │   ├── utils/");
    console.log("    │   │   ├── typeMapping.ts");
    console.log("    │   │   ├── schemaAnalysis.ts");
    console.log("    │   │   └── indexGeneration.ts");
    console.log("    │   └── index.ts           # Models coordinator");
    console.log(
      "    ├── components/             # Components generation stream",
    );
    console.log("    │   ├── generators/");
    console.log("    │   │   ├── forms.ts        # Form components");
    console.log("    │   │   └── tables.ts       # Table components");
    console.log("    │   ├── utils/");
    console.log("    │   │   ├── accessibilityCore.ts");
    console.log("    │   │   ├── accessibilityValidation.ts");
    console.log("    │   │   ├── accessibilityTesting.ts");
    console.log("    │   │   ├── fieldMapping.ts");
    console.log("    │   │   └── uiGeneration.ts");
    console.log("    │   └── index.ts           # Components coordinator");
    console.log("    └── index.ts               # Main coordinator");
    console.log("\n  Generated output:");
    console.log("    src/models/{table}/");
    console.log(
      "      ├── validation.ts        # Zod schemas + inferred types (single source of truth)",
    );
    console.log(
      "      ├── types.ts            # API types + relationships (extension layer)",
    );
    console.log("      ├── schema.ts           # Drizzle database schema");
    console.log("      └── index.ts");
    console.log("    src/components/{table}/");
    console.log("      ├── {Table}Form.tsx");
    console.log("      ├── {Table}Table.tsx");
    console.log("      └── index.ts");
  } catch (error) {
    console.error("❌ Error in coordinated generation:", error);
    process.exit(1);
  }
}

// Generate only models stream
async function generateModelsOnly(): Promise<void> {
  try {
    console.log("🔧 Generating models stream only...");
    await generateModels();
    await generateAllModelIndexes();
    console.log("✅ Models stream generated successfully!");
  } catch (error) {
    console.error("❌ Error generating models stream:", error);
    process.exit(1);
  }
}

// Generate only components stream
async function generateComponentsOnly(): Promise<void> {
  try {
    console.log("⚛️  Generating components stream only...");
    await generateComponents();
    console.log("✅ Components stream generated successfully!");
  } catch (error) {
    console.error("❌ Error generating components stream:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.includes("--models-only")) {
    generateModelsOnly();
  } else if (args.includes("--components-only")) {
    generateComponentsOnly();
  } else {
    generateAll();
  }
}

export { generateAll, generateModelsOnly, generateComponentsOnly };
