import { FunctionInfo, GitHubPrOptions } from "./lib/types";
import { generateDocsForFunctionBatch } from "./claude";
import fs from "node:fs";
import path from "node:path";
import {
  formatDocumentation,
  getIndentation,
  getInsertPosition,
} from "./github/utils";
import { createGitHubPullRequest } from "./github";

/**
 * Generates TsDoc comments for a list of functions using Claude API
 *
 * @param functionInfoList Array of function information extracted by extractFunctions
 * @param apiKey Claude API key
 * @param options Configuration options for output (PR creation or local output)
 * @param batchSize Optional number of functions to process in a single Claude API call
 * @returns Array of function information with generated documentation
 */
export async function generateTsDocs(
  functionInfoList: FunctionInfo[],
  apiKey: string,
  options?: {
    outputDir?: string;
    github?: GitHubPrOptions;
  },
  batchSize: number = 5,
): Promise<FunctionInfo[]> {
  // Group functions by file to minimize file read/writes
  const functionsByFile: Record<string, FunctionInfo[]> = {};

  for (const func of functionInfoList) {
    if (!functionsByFile[func.filePath]) {
      functionsByFile[func.filePath] = [];
    }
    functionsByFile[func.filePath].push(func);
  }

  const updatedFunctions: FunctionInfo[] = [];

  // Process functions in batches to avoid rate limits and improve throughput
  const batches: FunctionInfo[][] = [];
  let currentBatch: FunctionInfo[] = [];

  for (const func of functionInfoList) {
    currentBatch.push(func);

    if (currentBatch.length >= batchSize) {
      batches.push(currentBatch);
      currentBatch = [];
    }
  }

  // Add the last batch if it has any items
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(
      `Processing batch ${i + 1}/${batches.length} (${batch.length} functions)`,
    );

    try {
      const batchWithDocs = await generateDocsForFunctionBatch(batch, apiKey);
      updatedFunctions.push(...batchWithDocs);
    } catch (error) {
      console.error(`Error processing batch ${i + 1}:`, error);
      // If batch processing fails, try processing functions individually
      for (const func of batch) {
        try {
          const [funcWithDoc] = await generateDocsForFunctionBatch(
            [func],
            apiKey,
          );
          updatedFunctions.push(funcWithDoc);
        } catch (innerError) {
          console.error(`Failed to process function ${func.name}:`, innerError);
          // Keep the original function without updated docs
          updatedFunctions.push(func);
        }
      }
    }
  }

  // Handle output based on options
  if (options?.outputDir) {
    await writeUpdatedFiles(
      updatedFunctions,
      functionsByFile,
      options.outputDir,
    );
  } else if (options?.github) {
    await createGitHubPullRequest(
      updatedFunctions,
      functionsByFile,
      options.github,
    );
  }

  return updatedFunctions;
}

/**
 * Writes updated functions back to source files
 */
async function writeUpdatedFiles(
  updatedFunctions: FunctionInfo[],
  functionsByFile: Record<string, FunctionInfo[]>,
  outputDir: string,
): Promise<void> {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Process each file
  for (const filePath of Object.keys(functionsByFile)) {
    // Read the original file
    const fileContent = fs.readFileSync(filePath, "utf8");
    const lines = fileContent.split("\n");

    // Get functions for this file
    const fileFunctions = updatedFunctions.filter(
      (f) => f.filePath === filePath,
    );

    // Sort functions by start line in descending order to avoid position shifts
    fileFunctions.sort((a, b) => b.startLine - a.startLine);

    // Insert documentation for each function
    for (const func of fileFunctions) {
      if (!func.documentation) continue;

      // Calculate the position where the documentation should be inserted
      const insertPosition = getInsertPosition(lines, func.startLine);

      // Format the documentation with proper indentation
      const indentation = getIndentation(lines[func.startLine]);
      const formattedDoc = formatDocumentation(func.documentation, indentation);

      // Insert the documentation
      lines.splice(insertPosition, 0, formattedDoc);
    }

    // Determine output file path
    const relativeFilePath = path.relative(process.cwd(), filePath);
    const outputFilePath = path.join(outputDir, relativeFilePath);

    // Ensure directory exists
    const outputFileDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputFileDir)) {
      fs.mkdirSync(outputFileDir, { recursive: true });
    }

    // Write the updated file
    fs.writeFileSync(outputFilePath, lines.join("\n"));
    console.log(`Updated file written to ${outputFilePath}`);
  }
}

/**
 * Prepares file updates for GitHub PR
 */
export async function prepareFileUpdates(
  updatedFunctions: FunctionInfo[],
  functionsByFile: Record<string, FunctionInfo[]>,
): Promise<Array<{ path: string; content: string }>> {
  const fileUpdates = [];

  // Process each file
  for (const filePath of Object.keys(functionsByFile)) {
    // Read the original file
    const fileContent = fs.readFileSync(filePath, "utf8");
    const lines = fileContent.split("\n");

    // Get functions for this file
    const fileFunctions = updatedFunctions.filter(
      (f) => f.filePath === filePath,
    );

    // Sort functions by start line in descending order to avoid position shifts
    fileFunctions.sort((a, b) => b.startLine - a.startLine);

    // Insert documentation for each function
    for (const func of fileFunctions) {
      if (!func.documentation) continue;

      // Calculate the position where the documentation should be inserted
      const insertPosition = getInsertPosition(lines, func.startLine);

      // Format the documentation with proper indentation
      const indentation = getIndentation(lines[func.startLine]);
      const formattedDoc = formatDocumentation(func.documentation, indentation);

      // Insert the documentation
      lines.splice(insertPosition, 0, formattedDoc);
    }

    // Convert relative path for GitHub
    const relativePath = path.relative(process.cwd(), filePath);

    fileUpdates.push({
      path: relativePath,
      content: lines.join("\n"),
    });
  }

  return fileUpdates;
}
