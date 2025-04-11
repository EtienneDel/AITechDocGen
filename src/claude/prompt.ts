import { FunctionInfo } from "../lib/types";

/**
 * Creates an optimized prompt for Claude to generate TsDoc comments
 */
export function createPromptForFunctions(functions: FunctionInfo[]): string {
  // Get project context for better understanding
  const projectContext = getProjectContext(functions);

  const functionsText = functions
    .map((func) => {
      // Format parameters for better readability
      const paramsText = func.parameters
        .map((p) => {
          const optionalText = p.optional ? "?" : "";
          const defaultText = p.defaultValue ? ` = ${p.defaultValue}` : "";
          return `${p.name}${optionalText}: ${p.type}${defaultText}`;
        })
        .join(", ");

      // Create a complete function signature
      const asyncText = func.isAsync ? "async " : "";
      const generatorText = func.isGenerator ? "*" : "";
      const exportText = func.isExported ? "export " : "";

      return `
${exportText}${asyncText}function${generatorText} ${func.name}(${paramsText}): ${func.returnType} {
  ${func.body}
}`;
    })
    .join("\n\n");

  return `I need you to write clear, comprehensive TSDoc comments for the following TypeScript functions. For each function, provide:

1. A concise description of what the function does
2. @param tags for each parameter, explaining what they are and how they are used
3. @returns tag explaining the return value
4. @throws tag if any errors are explicitly thrown
5. @example tag with a simple usage example

Here's some context about the codebase:
${projectContext}

Here are the functions to document:

${functionsText}

For each function, respond ONLY with the TsDoc comment block in this exact format, with no additional explanation:

FUNCTION: [function name]
\`\`\`
/**
 * Description
 *
 * @param paramName Description of parameter
 * @returns Description of return value
 * @example
 * // Example code
 */
\`\`\`

Focus on being accurate, precise, and informative rather than verbose. Analyze the function body to understand its purpose, any side effects, and edge cases. Pay special attention to conditional logic, error handling, and data transformations.`;
}

/**
 * Extracts project context from functions to help Claude understand the codebase better
 */
function getProjectContext(functions: FunctionInfo[]): string {
  // Extract file paths to understand project structure
  const filePaths = [...new Set(functions.map((f) => f.filePath))];

  // Look for patterns in function names and file organization
  const functionNames = functions.map((f) => f.name);

  // Extract common types used in the codebase
  const paramTypes = new Set<string>();
  const returnTypes = new Set<string>();

  functions.forEach((func) => {
    returnTypes.add(func.returnType);
    func.parameters.forEach((param) => paramTypes.add(param.type));
  });

  return `Project Structure:
- Files involved: ${filePaths.join(", ")}
- Common function patterns: ${functionNames.join(", ")}
- Parameter types used: ${[...paramTypes].join(", ")}
- Return types used: ${[...returnTypes].join(", ")}`;
}
