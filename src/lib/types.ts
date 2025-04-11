import ts from "typescript";

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

export interface FunctionsByFile {
  filename: string;
  functions: FunctionInfo[];
}

export interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export type TsNode =
  | ts.FunctionDeclaration
  | ts.MethodDeclaration
  | ts.ArrowFunction
  | ts.FunctionExpression;
