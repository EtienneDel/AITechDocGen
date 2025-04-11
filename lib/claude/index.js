"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDocsForFunctionBatch = generateDocsForFunctionBatch;
/**
 * Generates documentation for a batch of functions using Claude API
 */
async function generateDocsForFunctionBatch(functions, apiKey) {
    // const prompt = createPromptForFunctions(functions);
    //
    // const response = await fetch("https://api.anthropic.com/v1/messages", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "x-api-key": apiKey,
    //     "anthropic-version": "2023-06-01",
    //   },
    //   body: JSON.stringify({
    //     model: "claude-3-5-sonnet-20240620",
    //     max_tokens: 4000,
    //     messages: [
    //       {
    //         role: "user",
    //         content: prompt,
    //       },
    //     ],
    //   }),
    // });
    //
    // if (!response.ok) {
    //   throw new Error(
    //     `Claude API error: ${response.status} ${response.statusText}`,
    //   );
    // }
    //
    // const claudeResponse = (await response.json()) as ClaudeResponse;
    // const responseText = claudeResponse.content[0].text;
    const responseText = `FUNCTION: signUp2
\`\`\`
/**
 * Description
 *
 * @param paramName Description of parameter
 * @returns Description of return value
 * @example
 * // Example code
 */
\`\`\``;
    // Extract the TsDoc comments for each function
    return extractTsDocsFromResponse(responseText, functions);
}
/**
 * Extracts TsDoc comments from Claude's response
 */
function extractTsDocsFromResponse(responseText, originalFunctions) {
    const updatedFunctions = [...originalFunctions];
    const functionRegex = /FUNCTION: (\S+)\s+```\s+(\/\*\*[\s\S]+?\*\/)\s+```/g;
    let match;
    while ((match = functionRegex.exec(responseText)) !== null) {
        const functionName = match[1];
        const tsDocComment = match[2];
        // Find the corresponding function in our list
        const functionIndex = updatedFunctions.findIndex((f) => f.name === functionName);
        if (functionIndex !== -1) {
            // Update the documentation field
            updatedFunctions[functionIndex] = {
                ...updatedFunctions[functionIndex],
                documentation: tsDocComment,
            };
        }
    }
    return updatedFunctions;
}
