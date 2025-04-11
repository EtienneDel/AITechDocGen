import * as ts from "typescript";
import { FunctionInfo } from "../lib/types";

/**
 * Extracts all functions from a list of TypeScript files
 *
 * @param fileNames Array of file paths to TypeScript files
 * @param options Optional TypeScript compiler options
 * @returns Array of extracted function information
 */
export function extractFunctions(
  fileNames: string[],
  options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  },
): FunctionInfo[] {
  // Create a Program from the files
  const program = ts.createProgram(fileNames, options);
  const checker = program.getTypeChecker();
  const functions: FunctionInfo[] = [];

  // Process each source file
  for (const sourceFile of program.getSourceFiles()) {
    // Skip declaration files and files not in our list
    if (
      sourceFile.isDeclarationFile ||
      !fileNames.includes(sourceFile.fileName)
    ) {
      continue;
    }

    // Visit each node in the source file
    ts.forEachChild(sourceFile, (node) => {
      visitNode(node, sourceFile);
    });
  }

  return functions;

  // Helper function to visit nodes recursively
  function visitNode(node: ts.Node, sourceFile: ts.SourceFile): void {
    // Function declarations
    if (ts.isFunctionDeclaration(node)) {
      processFunctionLike(node, sourceFile);
    }
    // Method declarations in classes/interfaces
    else if (ts.isMethodDeclaration(node)) {
      processFunctionLike(node, sourceFile);
    }
    // Arrow functions and function expressions with variable declarations
    else if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((declaration) => {
        if (declaration.initializer) {
          if (
            ts.isArrowFunction(declaration.initializer) ||
            ts.isFunctionExpression(declaration.initializer)
          ) {
            const name = declaration.name.getText(sourceFile);
            processFunctionLike(declaration.initializer, sourceFile, name);
          }
        }
      });
    }
    // Recursively visit all children
    ts.forEachChild(node, (childNode) => {
      visitNode(childNode, sourceFile);
    });
  }

  // Process function-like declarations and expressions
  function processFunctionLike(
    node:
      | ts.FunctionDeclaration
      | ts.MethodDeclaration
      | ts.ArrowFunction
      | ts.FunctionExpression,
    sourceFile: ts.SourceFile,
    variableName?: string,
  ): void {
    // Get function name
    let name: string;
    if ("name" in node && node.name) {
      name = node.name.getText(sourceFile);
    } else if (variableName) {
      name = variableName;
    } else {
      name = "<anonymous>";
    }

    // Get line numbers
    const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(
      node.getEnd(),
    );

    // Get parameters
    const parameters = node.parameters.map((param) => {
      const paramName = param.name.getText(sourceFile);
      const paramType = param.type
        ? param.type.getText(sourceFile)
        : inferType(param, checker);

      const optional = !!param.questionToken;

      let defaultValue: string | undefined;
      if (param.initializer) {
        defaultValue = param.initializer.getText(sourceFile);
      }

      return {
        name: paramName,
        type: paramType,
        optional,
        defaultValue,
      };
    });

    // Get return type
    let returnType: string;
    if ("type" in node && node.type) {
      returnType = node.type.getText(sourceFile);
    } else {
      // Try to infer return type from the signature
      const signature = checker.getSignatureFromDeclaration(node as any);
      returnType = signature
        ? checker.typeToString(checker.getReturnTypeOfSignature(signature))
        : "any";
    }

    // Get documentation from JSDoc comments
    let documentation = "";
    const docTags = ts.getJSDocTags(node);
    const commentRanges = ts.getLeadingCommentRanges(
      sourceFile.text,
      node.getFullStart(),
    );

    if (commentRanges && commentRanges.length > 0) {
      const commentStrings = commentRanges.map((range) =>
        sourceFile.text.substring(range.pos, range.end),
      );
      documentation = commentStrings.join("\n");
    }

    // Check if function is async
    const isAsync =
      node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword,
      ) ?? false;

    // Check if function is exported
    const isExported =
      node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) ?? false;

    // Check if function is a generator
    const isGenerator = !!node.asteriskToken;

    // Get function body text
    const body = node.body ? node.body.getText(sourceFile) : "";

    // Create function info object
    const functionInfo: FunctionInfo = {
      name,
      filePath: sourceFile.fileName,
      startLine,
      endLine,
      parameters,
      returnType,
      documentation,
      isAsync,
      isExported,
      isGenerator,
      body,
    };

    functions.push(functionInfo);
  }

  // Helper to infer types when not explicitly specified
  function inferType(
    node: ts.ParameterDeclaration,
    checker: ts.TypeChecker,
  ): string {
    try {
      const type = checker.getTypeAtLocation(node);
      return checker.typeToString(type);
    } catch (e) {
      return "any";
    }
  }
}
