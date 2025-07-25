import { TableConfig } from "../../lib/config";
import { writeAndFormatFile } from "../../lib/fileSystem";
import { generateFileHeader } from "../../lib/template";
import { toSingularCamelCase } from "../../lib/stringTransforms";

export async function generateModelAggregation(
  tables: TableConfig[],
  type: "schema" | "types" | "validation",
): Promise<void> {
  const descriptions = {
    schema: "Database schema aggregation for Drizzle Kit",
    types: "Types aggregation",
    validation: "Validation schemas aggregation",
  };

  let content = generateFileHeader(descriptions[type]);

  content += `// Export all enum ${type}\n`;
  content += `export * from './enums/${type}';\n\n`;

  content += `// Export all table ${type}\n`;
  tables.forEach((table) => {
    const fileName = toSingularCamelCase(table.tableName);
    content += `export * from './${fileName}/${type}';\n`;
  });

  await writeAndFormatFile(`./src/models/${type}.ts`, content);
}
