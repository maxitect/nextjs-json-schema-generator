#!/usr/bin/env tsx

/**
 * Models stream coordinator
 * Orchestrates generation of validation schemas, types, and database schemas
 */

import { generateZodSchemas } from "./generators/validation";
import { generateTypeScriptTypes } from "./generators/types";
import { generateDrizzleSchemas } from "./generators/schemas";

interface GenerateOptions {
  validationOnly?: boolean;
  schemasOnly?: boolean;
  typesOnly?: boolean;
}

// Parse command line arguments
function parseArgs(): GenerateOptions {
  const args = process.argv.slice(2);
  return {
    validationOnly: args.includes("--validation-only"),
    schemasOnly: args.includes("--schemas-only"),
    typesOnly: args.includes("--types-only"),
  };
}

// Generate all model-related files
async function generateModels(options: GenerateOptions = {}): Promise<void> {
  try {
    const { validationOnly, schemasOnly, typesOnly } = options;

    // If no specific flags, run all generators
    const runAll = !validationOnly && !schemasOnly && !typesOnly;

    console.log("🚀 Starting models generation...");

    // Step 1: Generate Zod validation schemas with inferred types
    if (runAll || validationOnly) {
      console.log("📝 Generating validation schemas and inferred types...");
      await generateZodSchemas();
    }

    // Step 2: Generate TypeScript extension types (API types, relationships)
    if (runAll || typesOnly) {
      console.log("🔗 Generating extension types and relationships...");
      await generateTypeScriptTypes();
    }

    // Step 3: Generate Drizzle database schemas
    if (runAll || schemasOnly) {
      console.log("🗄️  Generating database schemas...");
      await generateDrizzleSchemas();
    }

    console.log("✅ Models generation completed successfully!");
  } catch (error) {
    console.error("❌ Error in models generation:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  generateModels(options);
}

export { generateModels };
