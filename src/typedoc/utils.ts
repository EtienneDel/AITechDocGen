import fs from "node:fs";
import path from "node:path";
import { FileUpdates } from "../lib/types";

/**
 * Recursively scan directory and collect files
 * @param dir Directory to scan
 * @param baseDir Base directory for relative paths
 * @param fileUpdates
 */
export const scanDirectory = (
  dir: string,
  baseDir: string,
  fileUpdates: FileUpdates[] = [],
): FileUpdates[] => {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      scanDirectory(fullPath, baseDir, fileUpdates);
    } else {
      const relativePath = path.relative(process.cwd(), fullPath);
      const content = fs.readFileSync(fullPath, "utf8");
      fileUpdates.push({ path: relativePath, content });
    }
  }

  return fileUpdates;
};
