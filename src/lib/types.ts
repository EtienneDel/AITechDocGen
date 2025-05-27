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

export interface FileUpdates {
  path: string;
  content: string;
}

export interface ClaudeResponse {
  content: {
    type: string;
    text: string;
  }[];
}

export interface GithubTreeEntry {
  path: string;
  mode: "100644";
  type: "blob";
  content: string;
}

export type TsNode =
  | ts.FunctionDeclaration
  | ts.MethodDeclaration
  | ts.ArrowFunction
  | ts.FunctionExpression;
