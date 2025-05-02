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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFunctions = extractFunctions;
const typescript_1 = __importDefault(require("typescript"));
const utils_1 = require("./utils");
const core = __importStar(require("@actions/core"));
const processFunction = (node, sourceFile, checker, variableName) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return ({
        name: (_b = variableName !== null && variableName !== void 0 ? variableName : (_a = node.name) === null || _a === void 0 ? void 0 : _a.getText(sourceFile)) !== null && _b !== void 0 ? _b : "<anonymous>",
        filePath: sourceFile.fileName,
        startLine: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
            .line,
        endLine: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line,
        parameters: (0, utils_1.getFunctionParameters)(node.parameters, sourceFile, checker),
        returnType: (0, utils_1.getFunctionReturnType)(node, sourceFile, checker),
        documentation: (0, utils_1.getFunctionDocumentation)(node, sourceFile),
        isAsync: (_d = (_c = node.modifiers) === null || _c === void 0 ? void 0 : _c.some(({ kind }) => kind === typescript_1.default.SyntaxKind.AsyncKeyword)) !== null && _d !== void 0 ? _d : false,
        isExported: (_f = (_e = node.modifiers) === null || _e === void 0 ? void 0 : _e.some(({ kind }) => kind === typescript_1.default.SyntaxKind.ExportKeyword)) !== null && _f !== void 0 ? _f : false,
        isGenerator: !!node.asteriskToken,
        body: (_h = (_g = node.body) === null || _g === void 0 ? void 0 : _g.getText(sourceFile)) !== null && _h !== void 0 ? _h : "",
    });
};
// Helper function to visit nodes recursively
const visitNode = (node, sourceFile, checker, functions) => {
    // Function and Method declarations
    if (typescript_1.default.isFunctionDeclaration(node) || typescript_1.default.isMethodDeclaration(node)) {
        functions.push(processFunction(node, sourceFile, checker));
    }
    // Arrow functions and function expressions with variable declarations
    else if (typescript_1.default.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
            if (!declaration.initializer ||
                (!typescript_1.default.isArrowFunction(declaration.initializer) &&
                    !typescript_1.default.isFunctionExpression(declaration.initializer))) {
                continue;
            }
            functions.push(processFunction(declaration.initializer, sourceFile, checker, declaration.name.getText(sourceFile)));
        }
    }
    // Recursively visit all children
    typescript_1.default.forEachChild(node, (childNode) => {
        visitNode(childNode, sourceFile, checker, functions);
    });
};
/**
 * Extracts all functions from a list of TypeScript files
 *
 * @param fileNames Array of file paths to TypeScript files
 * @returns Array of extracted function information
 */
function extractFunctions(fileNames) {
    // Create a Program from the files
    const program = typescript_1.default.createProgram(fileNames, {
        target: typescript_1.default.ScriptTarget.ES2020,
        module: typescript_1.default.ModuleKind.CommonJS,
    });
    const checker = program.getTypeChecker();
    const functionsByFile = [];
    // Process each source file
    for (const sourceFile of program.getSourceFiles()) {
        // Skip declaration files and files not in our list
        if (sourceFile.isDeclarationFile ||
            !fileNames.includes(sourceFile.fileName)) {
            continue;
        }
        const functions = [];
        // Visit each node in the source file
        typescript_1.default.forEachChild(sourceFile, (node) => {
            visitNode(node, sourceFile, checker, functions);
        });
        core.info(`Extracted ${functions.length.toString()} functions from ${sourceFile.fileName}`);
        functionsByFile.push({ filename: sourceFile.fileName, functions });
    }
    return functionsByFile;
}
