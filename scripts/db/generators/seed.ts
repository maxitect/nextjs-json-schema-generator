#!/usr/bin/env tsx

import { TableConfig } from "../../lib/config";
import { writeAndFormatFile, loadAllTables } from "../../lib/fileSystem";
import { generateFileHeader } from "../../lib/template";
import {
  toCamelCase,
  toSingularCamelCase,
  toSingularPascalCase,
} from "../../lib/stringTransforms";

function transformSeedDataKeys<T extends Record<string, unknown>>(
  seedData: T[],
): Record<string, unknown>[] {
  return seedData.map((record) => {
    const transformed: Record<string, unknown> = {};
    Object.entries(record).forEach(([key, value]) => {
      transformed[toCamelCase(key)] = value;
    });
    return transformed;
  });
}

function generateSeedData(tables: TableConfig[]): string {
  const tablesWithSeeds = tables.filter(
    (table) => table.seedData && table.seedData.length > 0,
  );

  if (tablesWithSeeds.length === 0) {
    return `
async function seed() {
  console.log('No seed data configured')
  console.log('🎉 Database seeding completed!')
}
`;
  }

  // Generate schema imports (for table definitions)
  const schemaImports = tablesWithSeeds
    .map((table) => {
      const tableName = toCamelCase(table.tableName);
      const fileName = toSingularCamelCase(table.tableName);
      return `import { ${tableName} } from '../models/${fileName}/schema'`;
    })
    .join("\n");

  // Generate type imports (for type safety)
  const typeImports = tablesWithSeeds
    .map((table) => {
      const typeName = `${toSingularPascalCase(table.tableName)}Insert`;
      const fileName = toSingularCamelCase(table.tableName);
      return `import type { ${typeName} } from '../models/${fileName}/types'`;
    })
    .join("\n");

  const seedOperations = tablesWithSeeds
    .map((table) => {
      const tableName = toCamelCase(table.tableName);
      const typeName = `${toSingularPascalCase(table.tableName)}Insert`;
      const transformedSeedData = transformSeedDataKeys(table.seedData ?? []);
      const seedDataJson = JSON.stringify(transformedSeedData, null, 6);

      return `
    // Seed ${table.displayName}
    const ${tableName}Data: ${typeName}[] = ${seedDataJson}
    
    const inserted${toCamelCase(table.tableName)} = await db
      .insert(${tableName})
      .values(${tableName}Data)
      .onConflictDoNothing()
      .returning()
    
    console.log(\`✅ Seeded \${inserted${toCamelCase(table.tableName)}.length} ${table.displayName.toLowerCase()}\`)`;
    })
    .join("\n");

  return `
${schemaImports}
${typeImports}

async function seed() {
  console.log('Seeding database...')

  try {
${seedOperations}

    console.log('🎉 Database seeded successfully!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await sql.end()
  }
}
`;
}

async function generateSeedScript(): Promise<void> {
  try {
    console.log("Generating seed script from table configurations...");

    const tables = await loadAllTables();

    let content = generateFileHeader("Auto-generated database seed script");

    content += `import { db, sql } from './connection'\n`;
    content += `import { config } from "dotenv";\n`;
    content += `\nconfig();\n`;
    content += generateSeedData(tables);
    content += `
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  seed()
}

export { seed }
`;

    await writeAndFormatFile("./src/db/seed.ts", content);

    console.log("✅ Seed script generated successfully!");
  } catch (error) {
    console.error("❌ Error generating seed script:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateSeedScript();
}

export { generateSeedScript };
