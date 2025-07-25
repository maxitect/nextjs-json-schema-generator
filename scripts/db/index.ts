#!/usr/bin/env tsx

import { generateSeedScript } from "./generators/seed";

async function generateDatabase(): Promise<void> {
  try {
    console.log("🗄️  Starting database generation...");

    console.log("🌱 Generating seed script...");
    await generateSeedScript();

    console.log("✅ Database generation completed successfully!");
  } catch (error) {
    console.error("❌ Error in database generation:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateDatabase();
}

export { generateDatabase };
