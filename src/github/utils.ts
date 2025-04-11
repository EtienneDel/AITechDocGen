/**
 * Determines the correct position to insert documentation
 */
export function getInsertPosition(
  lines: string[],
  functionStartLine: number,
): number {
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
export function getIndentation(line: string): string {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : "";
}

/**
 * Formats documentation with proper indentation
 */
export function formatDocumentation(
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
