"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTsDocs = generateTsDocs;
exports.prepareFileUpdates = prepareFileUpdates;
const claude_1 = require("./claude");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const utils_1 = require("./github/utils");
const github_1 = require("./github");
/**
 * Generates TsDoc comments for a list of functions using Claude API
 *
 * @param functionInfoList Array of function information extracted by extractFunctions
 * @param apiKey Claude API key
 * @param options Configuration options for output (PR creation or local output)
 * @param batchSize Optional number of functions to process in a single Claude API call
 * @returns Array of function information with generated documentation
 */
async function generateTsDocs(functionInfoList, apiKey, options, batchSize = 5) {
    // Group functions by file to minimize file read/writes
    const functionsByFile = {};
    for (const func of functionInfoList) {
        if (!functionsByFile[func.filePath]) {
            functionsByFile[func.filePath] = [];
        }
        functionsByFile[func.filePath].push(func);
    }
    const updatedFunctions = [];
    // Process functions in batches to avoid rate limits and improve throughput
    const batches = [];
    let currentBatch = [];
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
        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} functions)`);
        try {
            const batchWithDocs = await (0, claude_1.generateDocsForFunctionBatch)(batch, apiKey);
            updatedFunctions.push(...batchWithDocs);
        }
        catch (error) {
            console.error(`Error processing batch ${i + 1}:`, error);
            // If batch processing fails, try processing functions individually
            for (const func of batch) {
                try {
                    const [funcWithDoc] = await (0, claude_1.generateDocsForFunctionBatch)([func], apiKey);
                    updatedFunctions.push(funcWithDoc);
                }
                catch (innerError) {
                    console.error(`Failed to process function ${func.name}:`, innerError);
                    // Keep the original function without updated docs
                    updatedFunctions.push(func);
                }
            }
        }
    }
    // Handle output based on options
    if (options === null || options === void 0 ? void 0 : options.outputDir) {
        await writeUpdatedFiles(updatedFunctions, functionsByFile, options.outputDir);
    }
    else if (options === null || options === void 0 ? void 0 : options.github) {
        await (0, github_1.createGitHubPullRequest)(updatedFunctions, functionsByFile, options.github);
    }
    return updatedFunctions;
}
/**
 * Writes updated functions back to source files
 */
async function writeUpdatedFiles(updatedFunctions, functionsByFile, outputDir) {
    // Create output directory if it doesn't exist
    if (!node_fs_1.default.existsSync(outputDir)) {
        node_fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    // Process each file
    for (const filePath of Object.keys(functionsByFile)) {
        // Read the original file
        const fileContent = node_fs_1.default.readFileSync(filePath, "utf8");
        const lines = fileContent.split("\n");
        // Get functions for this file
        const fileFunctions = updatedFunctions.filter((f) => f.filePath === filePath);
        // Sort functions by start line in descending order to avoid position shifts
        fileFunctions.sort((a, b) => b.startLine - a.startLine);
        // Insert documentation for each function
        for (const func of fileFunctions) {
            if (!func.documentation)
                continue;
            // Calculate the position where the documentation should be inserted
            const insertPosition = (0, utils_1.getInsertPosition)(lines, func.startLine);
            // Format the documentation with proper indentation
            const indentation = (0, utils_1.getIndentation)(lines[func.startLine]);
            const formattedDoc = (0, utils_1.formatDocumentation)(func.documentation, indentation);
            // Insert the documentation
            lines.splice(insertPosition, 0, formattedDoc);
        }
        // Determine output file path
        const relativeFilePath = node_path_1.default.relative(process.cwd(), filePath);
        const outputFilePath = node_path_1.default.join(outputDir, relativeFilePath);
        // Ensure directory exists
        const outputFileDir = node_path_1.default.dirname(outputFilePath);
        if (!node_fs_1.default.existsSync(outputFileDir)) {
            node_fs_1.default.mkdirSync(outputFileDir, { recursive: true });
        }
        // Write the updated file
        node_fs_1.default.writeFileSync(outputFilePath, lines.join("\n"));
        console.log(`Updated file written to ${outputFilePath}`);
    }
}
/**
 * Prepares file updates for GitHub PR
 */
async function prepareFileUpdates(updatedFunctions, functionsByFile) {
    const fileUpdates = [];
    // Process each file
    for (const filePath of Object.keys(functionsByFile)) {
        // Read the original file
        const fileContent = node_fs_1.default.readFileSync(filePath, "utf8");
        const lines = fileContent.split("\n");
        // Get functions for this file
        const fileFunctions = updatedFunctions.filter((f) => f.filePath === filePath);
        // Sort functions by start line in descending order to avoid position shifts
        fileFunctions.sort((a, b) => b.startLine - a.startLine);
        // Insert documentation for each function
        for (const func of fileFunctions) {
            if (!func.documentation)
                continue;
            // Calculate the position where the documentation should be inserted
            const insertPosition = (0, utils_1.getInsertPosition)(lines, func.startLine);
            // Format the documentation with proper indentation
            const indentation = (0, utils_1.getIndentation)(lines[func.startLine]);
            const formattedDoc = (0, utils_1.formatDocumentation)(func.documentation, indentation);
            // Insert the documentation
            lines.splice(insertPosition, 0, formattedDoc);
        }
        // Convert relative path for GitHub
        const relativePath = node_path_1.default.relative(process.cwd(), filePath);
        fileUpdates.push({
            path: relativePath,
            content: lines.join("\n"),
        });
    }
    return fileUpdates;
}
