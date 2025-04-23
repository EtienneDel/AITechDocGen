import ts from "typescript";
import { TsNode } from "../lib/types";

export const getFunctionParameters = (
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
) => {
  return parameters.map((param) => ({
    name: param.name.getText(sourceFile),
    type: param.type
      ? param.type.getText(sourceFile)
      : inferType(param, checker),
    optional: !!param.questionToken,
    defaultValue: param.initializer?.getText(sourceFile) ?? undefined,
  }));
};

export const getFunctionReturnType = (
  node: TsNode,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
) => {
  if ("type" in node && node.type) {
    return node.type.getText(sourceFile);
  }

  // Try to infer return type from the signature
  const signature = checker.getSignatureFromDeclaration(node as never);

  return signature
    ? checker.typeToString(checker.getReturnTypeOfSignature(signature))
    : "any";
};

export const getFunctionDocumentation = (
  node: TsNode,
  sourceFile: ts.SourceFile,
) =>
  ts
    .getLeadingCommentRanges(sourceFile.text, node.getFullStart())
    ?.map((range) => sourceFile.text.substring(range.pos, range.end))
    .join("\n") ?? "";

// Helper to infer types when not explicitly specified
export const inferType = (
  node: ts.ParameterDeclaration,
  checker: ts.TypeChecker,
): string => {
  try {
    const type = checker.getTypeAtLocation(node);
    return checker.typeToString(type);
  } catch {
    return "any";
  }
};
