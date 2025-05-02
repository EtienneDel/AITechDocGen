"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDocsForFunctionBatch = void 0;
/**
 * Generates documentation for a batch of functions using Claude API
 */
const generateDocsForFunctionBatch = async (functionsByFile, apiKey) => {
    // const prompt = createPromptForFunctions(
    //   functionsByFile.flatMap(({ functions }) => functions),
    // );
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
    //     `Claude API error: ${response.status.toString()} ${response.statusText}`,
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
    return extractTsDocsFromResponse(responseText, functionsByFile);
};
exports.generateDocsForFunctionBatch = generateDocsForFunctionBatch;
/**
 * Extracts TsDoc comments from Claude's response
 */
function extractTsDocsFromResponse(responseText, functionsByFile) {
    const functionRegex = /FUNCTION: (\S+)\s+```\s+(\/\*\*[\s\S]+?\*\/)\s+```/g;
    let match;
    const responses = [];
    while ((match = functionRegex.exec(responseText)) !== null) {
        const functionName = match[1];
        const tsDocComment = match[2];
        responses.push({ functionName, tsDocComment });
    }
    return functionsByFile.map(({ filename, functions }) => ({
        filename,
        functions: functions.map((f) => {
            var _a, _b;
            return ({
                ...f,
                documentation: (_b = (_a = responses.find(({ functionName }) => functionName === f.name)) === null || _a === void 0 ? void 0 : _a.tsDocComment) !== null && _b !== void 0 ? _b : f.documentation,
            });
        }),
    }));
}
