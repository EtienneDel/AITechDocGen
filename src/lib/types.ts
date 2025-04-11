interface FunctionParameter {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface FunctionInfo {
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  parameters: FunctionParameter[];
  returnType: string;
  documentation: string;
  isAsync: boolean;
  isExported: boolean;
  isGenerator: boolean;
  body: string;
}

export interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface GitHubPrOptions {
  token: string;
  baseBranch?: string;
  prTitle?: string;
  prBody?: string;
}
