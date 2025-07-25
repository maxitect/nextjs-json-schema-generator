import { TableConfig } from "../../lib/config";
import { writeAndFormatFile } from "../../lib/fileSystem";
import { generateFileHeader } from "../../lib/template";
import {
  toSingularCamelCase,
  toSingularPascalCase,
} from "../../lib/stringTransforms";

// Model index file generation utility
export async function generateModelIndex(
  table: TableConfig,
  exports: string[],
): Promise<void> {
  const fileName = toSingularCamelCase(table.tableName);
  let content = generateFileHeader(
    `${toSingularPascalCase(table.tableName)} model exports`,
  );

  content += "// Export all generated files for this model\n";
  exports.forEach((exportName) => {
    content += `export * from './${exportName}';\n`;
  });

  await writeAndFormatFile(`./src/models/${fileName}/index.ts`, content);
}

// Enums index file generation utility
export async function generateEnumsIndex(exports: string[]): Promise<void> {
  let content = generateFileHeader("Enums model exports");

  content += "// Export all enum generated files\n";
  exports.forEach((exportName) => {
    content += `export * from './${exportName}';\n`;
  });

  await writeAndFormatFile("./src/models/enums/index.ts", content);
}

// Utils index file generation utility
export async function generateUtilsIndex(exports: string[]): Promise<void> {
  let content = generateFileHeader("Utils model exports");

  content += "// Export all utility generated files\n";
  exports.forEach((exportName) => {
    content += `export * from './${exportName}';\n`;
  });

  await writeAndFormatFile("./src/models/utils/index.ts", content);
}
