import { FileUpdates, FunctionsByFile } from "../lib/types";
import * as fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";

/**
 * Prepares file updates for GitHub PR
 */
export const prepareFileUpdates = (
  functionsByFile: FunctionsByFile[],
): FileUpdates[] => {
  const fileUpdates = [];

  for (const file of functionsByFile) {
    file.functions.sort((a, b) => b.startLine - a.startLine);

    const fileContent = fs.readFileSync(file.filename, "utf8");
    const lines = fileContent.split("\n");

    for (const [index, func] of file.functions.entries()) {
      if (!func.documentation.length) continue;

      const previousFunction =
        index + 1 <= file.functions.length - 1
          ? file.functions[index + 1]
          : undefined;

      core.info(`###### ${index.toString()} ######`);
      core.info(
        previousFunction
          ? JSON.stringify(previousFunction)
          : "No previous function",
      );

      // Format the documentation with proper indentation
      const indentation = getIndentation(lines[func.startLine]);
      const formattedDoc = formatDocumentation(func.documentation, indentation);

      // Insert the documentation
      if (previousFunction) {
        const spacingLines = getSpacingLines(
          lines.slice(previousFunction.endLine + 1),
        );
        lines.splice(
          previousFunction.endLine + 1 + spacingLines,
          lines.slice(
            previousFunction.endLine + 1 + spacingLines,
            func.startLine,
          ).length,
          formattedDoc,
        );
      } else {
        lines.splice(
          func.startLine,
          lines.slice(0, func.startLine).length,
          formattedDoc,
        );
      }
    }

    // Convert relative path for GitHub
    const relativePath = path.relative(process.cwd(), file.filename);

    fileUpdates.push({
      path: relativePath,
      content: lines.join("\n"),
    });
  }

  core.info(`Prepared updates for ${fileUpdates.length.toString()} files`);

  return fileUpdates;
};

/**
 * Gets the indentation from a line of code
 */
export const getIndentation = (line: string): string => {
  const match = /^(\s*)/.exec(line);
  return match ? match[1] : "";
};

/**
 * Formats documentation with proper indentation
 */
export const formatDocumentation = (
  documentation: string,
  indentation: string,
): string => {
  return documentation
    .split("\n")
    .map((line) => (line.trim().length ? indentation + line.trim() : line))
    .join("\n");
};

export const getSpacingLines = (lines: string[]) => {
  let i = 0;
  while (!lines[i]?.trim().length) {
    if (!lines[i]) break;
    i++;
  }
  return i;
};
