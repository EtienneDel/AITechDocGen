import { FunctionsByFile } from "../lib/types";
import * as fs from "node:fs";
import path from "node:path";

/**
 * Prepares file updates for GitHub PR
 */
export async function prepareFileUpdates(
  functionsByFile: FunctionsByFile[],
): Promise<{ path: string; content: string }[]> {
  const fileUpdates = [];

  for (const file of functionsByFile) {
    file.functions.sort((a, b) => b.startLine - a.startLine);

    const fileContent = fs.readFileSync(file.filename, "utf8");
    const lines = fileContent.split("\n");

    for (const func of file.functions) {
      if (!func.documentation?.length) continue;

      // Calculate the position where the documentation should be inserted
      const insertPosition = getInsertPosition(lines, func.startLine);

      // Format the documentation with proper indentation
      const indentation = getIndentation(lines[func.startLine]);
      const formattedDoc = formatDocumentation(func.documentation, indentation);

      // Insert the documentation
      lines.splice(insertPosition, 0, formattedDoc);
    }

    // Convert relative path for GitHub
    const relativePath = path.relative(process.cwd(), file.filename);

    fileUpdates.push({
      path: relativePath,
      content: lines.join("\n"),
    });
  }

  return fileUpdates;
}

/**
 * Determines the correct position to insert documentation
 */
function getInsertPosition(lines: string[], functionStartLine: number): number {
  // Check previous lines for existing comments or decorators
  let currentLine = functionStartLine - 1;

  while (currentLine >= 0) {
    const line = lines[currentLine].trim();

    // If we find a non-empty line that isn't a comment or decorator, stop
    if (
      line &&
      !line.startsWith("//") &&
      !line.startsWith("/*") &&
      !line.startsWith("*") &&
      !line.startsWith("@")
    ) {
      break;
    }

    // Skip existing TSDoc comments
    if (line.startsWith("/**")) {
      // Skip the entire comment block
      while (currentLine >= 0 && !lines[currentLine].includes("*/")) {
        currentLine--;
      }
      if (currentLine >= 0) {
        currentLine--; // Skip the closing */
      }
      continue;
    }

    currentLine--;
  }

  return currentLine + 1;
}

/**
 * Gets the indentation from a line of code
 */
function getIndentation(line: string): string {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : "";
}

/**
 * Formats documentation with proper indentation
 */
function formatDocumentation(
  documentation: string,
  indentation: string,
): string {
  return documentation
    .split("\n")
    .map((line, index) => {
      if (index === 0) return indentation + line;
      return indentation + line;
    })
    .join("\n");
}
