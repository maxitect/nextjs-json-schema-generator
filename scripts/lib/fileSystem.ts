import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { EnumsConfig, TableConfig } from "./config";

const execAsync = promisify(exec);

// File system utilities
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

export async function writeFile(
  filePath: string,
  content: string,
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
  console.log(`Generated: ${filePath}`);
}

// Format a file using Prettier
export async function formatFile(filePath: string): Promise<void> {
  try {
    await execAsync(`npx prettier --write "${filePath}"`);
    console.log(`Formatted: ${filePath}`);
  } catch (error) {
    console.warn(`Failed to format ${filePath}:`, error);
  }
}

// Write and format a file in one operation
export async function writeAndFormatFile(
  filePath: string,
  content: string,
): Promise<void> {
  await writeFile(filePath, content);
  await formatFile(filePath);
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

// JSON schema loading utilities
export async function loadEnums(): Promise<EnumsConfig> {
  const enumsDir = "./db/enums";
  try {
    const files = await fs.readdir(enumsDir);
    const enumFiles = files.filter((f) => f.endsWith(".json"));

    const enums: EnumsConfig = {};
    for (const file of enumFiles) {
      const enumName = file.replace(".json", "");
      const enumConfig = await readJsonFile<EnumsConfig[string]>(
        `${enumsDir}/${file}`,
      );
      enums[enumName] = enumConfig;
    }

    return enums;
  } catch (error) {
    console.warn(
      "No enum configurations found, falling back to legacy enums.json",
    );
    try {
      return readJsonFile<EnumsConfig>("./db/enums.json");
    } catch (legacyError) {
      console.warn("No enum configurations found at all");
      return {};
    }
  }
}

export async function loadTable(tableName: string): Promise<TableConfig> {
  return readJsonFile<TableConfig>(`./db/tables/${tableName}.json`);
}

export async function loadAllTables(): Promise<TableConfig[]> {
  const tablesDir = "./db/tables";
  try {
    const files = await fs.readdir(tablesDir);
    const tableFiles = files.filter((f) => f.endsWith(".json"));
    const tables = await Promise.all(
      tableFiles.map((file) => loadTable(file.replace(".json", ""))),
    );
    return tables;
  } catch (error) {
    console.warn("No table configurations found");
    return [];
  }
}
