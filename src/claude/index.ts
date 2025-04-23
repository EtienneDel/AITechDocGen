import { ClaudeResponse, FunctionsByFile } from "../lib/types";
import { createPromptForFunctions } from "./prompt";

/**
 * Generates documentation for a batch of functions using Claude API
 */
export const generateDocsForFunctionBatch = async (
  functionsByFile: FunctionsByFile[],
  apiKey: string,
): Promise<FunctionsByFile[]> => {
  const prompt = createPromptForFunctions(
    functionsByFile.flatMap(({ functions }) => functions),
  );

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Claude API error: ${response.status.toString()} ${response.statusText}`,
    );
  }

  const claudeResponse = (await response.json()) as ClaudeResponse;
  const responseText = claudeResponse.content[0].text;

  // Extract the TsDoc comments for each function
  return extractTsDocsFromResponse(responseText, functionsByFile);
};

/**
 * Extracts TsDoc comments from Claude's response
 */
function extractTsDocsFromResponse(
  responseText: string,
  functionsByFile: FunctionsByFile[],
): FunctionsByFile[] {
  const functionRegex = /FUNCTION: (\S+)\s+```\s+(\/\*\*[\s\S]+?\*\/)\s+```/g;

  let match;
  const responses: { functionName: string; tsDocComment: string }[] = [];

  while ((match = functionRegex.exec(responseText)) !== null) {
    const functionName = match[1];
    const tsDocComment = match[2];

    responses.push({ functionName, tsDocComment });
  }

  return functionsByFile.map(({ filename, functions }) => ({
    filename,
    functions: functions.map((f) => ({
      ...f,
      documentation:
        responses.find(({ functionName }) => functionName === f.name)
          ?.tsDocComment ?? f.documentation,
    })),
  }));
}
