import ts from "typescript";
import { FunctionInfo, FunctionsByFile, TsNode } from "../lib/types";
import {
  getFunctionDocumentation,
  getFunctionParameters,
  getFunctionReturnType,
} from "./utils";
import * as core from "@actions/core";

const processFunction = (
  node: TsNode,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  variableName?: string,
): FunctionInfo => ({
  name: variableName || node.name?.getText(sourceFile) || "<anonymous>",
  filePath: sourceFile.fileName,
  startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
    .line,
  endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line,
  parameters: getFunctionParameters(node.parameters, sourceFile, checker),
  returnType: getFunctionReturnType(node, sourceFile, checker),
  documentation: getFunctionDocumentation(node, sourceFile),
  isAsync:
    node.modifiers?.some(({ kind }) => kind === ts.SyntaxKind.AsyncKeyword) ??
    false,
  isExported:
    node.modifiers?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword) ??
    false,
  isGenerator: !!node.asteriskToken,
  body: node.body?.getText(sourceFile) || "",
});

// Helper function to visit nodes recursively
const visitNode = (
  node: ts.Node,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  functions: FunctionInfo[],
): void => {
  // Function and Method declarations
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    functions.push(processFunction(node, sourceFile, checker));
  }
  // Arrow functions and function expressions with variable declarations
  else if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) {
      if (
        !declaration.initializer ||
        (!ts.isArrowFunction(declaration.initializer) &&
          !ts.isFunctionExpression(declaration.initializer))
      ) {
        continue;
      }

      functions.push(
        processFunction(
          declaration.initializer,
          sourceFile,
          checker,
          declaration.name.getText(sourceFile),
        ),
      );
    }
  }
  // Recursively visit all children
  ts.forEachChild(node, (childNode) => {
    visitNode(childNode, sourceFile, checker, functions);
  });
};

/**
 * Extracts all functions from a list of TypeScript files
 *
 * @param fileNames Array of file paths to TypeScript files
 * @returns Array of extracted function information
 */
export function extractFunctions(fileNames: string[]): FunctionsByFile[] {
  // Create a Program from the files
  const program = ts.createProgram(fileNames, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  });

  const checker = program.getTypeChecker();
  const functionsByFile: FunctionsByFile[] = [];

  // Process each source file
  for (const sourceFile of program.getSourceFiles()) {
    // Skip declaration files and files not in our list
    if (
      sourceFile.isDeclarationFile ||
      !fileNames.includes(sourceFile.fileName)
    ) {
      continue;
    }

    let functions: FunctionInfo[] = [];

    // Visit each node in the source file
    ts.forEachChild(sourceFile, (node) => {
      visitNode(node, sourceFile, checker, functions);
    });

    core.info(
      `Extracted ${functions.length} functions from ${sourceFile.fileName}`,
    );

    functionsByFile.push({ filename: sourceFile.fileName, functions });
  }

  return functionsByFile;
}
