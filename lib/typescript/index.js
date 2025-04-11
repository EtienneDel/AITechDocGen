"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFunctions = extractFunctions;
const ts = __importStar(require("typescript"));
/**
 * Extracts all functions from a list of TypeScript files
 *
 * @param fileNames Array of file paths to TypeScript files
 * @param options Optional TypeScript compiler options
 * @returns Array of extracted function information
 */
function extractFunctions(fileNames, options = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
}) {
    // Create a Program from the files
    const program = ts.createProgram(fileNames, options);
    const checker = program.getTypeChecker();
    const functions = [];
    // Process each source file
    for (const sourceFile of program.getSourceFiles()) {
        // Skip declaration files and files not in our list
        if (sourceFile.isDeclarationFile ||
            !fileNames.includes(sourceFile.fileName)) {
            continue;
        }
        // Visit each node in the source file
        ts.forEachChild(sourceFile, (node) => {
            visitNode(node, sourceFile);
        });
    }
    return functions;
    // Helper function to visit nodes recursively
    function visitNode(node, sourceFile) {
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
                    if (ts.isArrowFunction(declaration.initializer) ||
                        ts.isFunctionExpression(declaration.initializer)) {
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
    function processFunctionLike(node, sourceFile, variableName) {
        var _a, _b, _c, _d;
        // Get function name
        let name;
        if ("name" in node && node.name) {
            name = node.name.getText(sourceFile);
        }
        else if (variableName) {
            name = variableName;
        }
        else {
            name = "<anonymous>";
        }
        // Get line numbers
        const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        // Get parameters
        const parameters = node.parameters.map((param) => {
            const paramName = param.name.getText(sourceFile);
            const paramType = param.type
                ? param.type.getText(sourceFile)
                : inferType(param, checker);
            const optional = !!param.questionToken;
            let defaultValue;
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
        let returnType;
        if ("type" in node && node.type) {
            returnType = node.type.getText(sourceFile);
        }
        else {
            // Try to infer return type from the signature
            const signature = checker.getSignatureFromDeclaration(node);
            returnType = signature
                ? checker.typeToString(checker.getReturnTypeOfSignature(signature))
                : "any";
        }
        // Get documentation from JSDoc comments
        let documentation = "";
        const docTags = ts.getJSDocTags(node);
        const commentRanges = ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart());
        if (commentRanges && commentRanges.length > 0) {
            const commentStrings = commentRanges.map((range) => sourceFile.text.substring(range.pos, range.end));
            documentation = commentStrings.join("\n");
        }
        // Check if function is async
        const isAsync = (_b = (_a = node.modifiers) === null || _a === void 0 ? void 0 : _a.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)) !== null && _b !== void 0 ? _b : false;
        // Check if function is exported
        const isExported = (_d = (_c = node.modifiers) === null || _c === void 0 ? void 0 : _c.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) !== null && _d !== void 0 ? _d : false;
        // Check if function is a generator
        const isGenerator = !!node.asteriskToken;
        // Get function body text
        const body = node.body ? node.body.getText(sourceFile) : "";
        // Create function info object
        const functionInfo = {
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
    function inferType(node, checker) {
        try {
            const type = checker.getTypeAtLocation(node);
            return checker.typeToString(type);
        }
        catch (e) {
            return "any";
        }
    }
}
