"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferType = exports.getFunctionDocumentation = exports.getFunctionReturnType = exports.getFunctionParameters = void 0;
const typescript_1 = __importDefault(require("typescript"));
const getFunctionParameters = (parameters, sourceFile, checker) => {
    return parameters.map((param) => {
        var _a, _b;
        return ({
            name: param.name.getText(sourceFile),
            type: param.type
                ? param.type.getText(sourceFile)
                : (0, exports.inferType)(param, checker),
            optional: !!param.questionToken,
            defaultValue: (_b = (_a = param.initializer) === null || _a === void 0 ? void 0 : _a.getText(sourceFile)) !== null && _b !== void 0 ? _b : undefined,
        });
    });
};
exports.getFunctionParameters = getFunctionParameters;
const getFunctionReturnType = (node, sourceFile, checker) => {
    if ("type" in node && node.type) {
        return node.type.getText(sourceFile);
    }
    // Try to infer return type from the signature
    const signature = checker.getSignatureFromDeclaration(node);
    return signature
        ? checker.typeToString(checker.getReturnTypeOfSignature(signature))
        : "any";
};
exports.getFunctionReturnType = getFunctionReturnType;
const getFunctionDocumentation = (node, sourceFile) => {
    var _a, _b;
    return (_b = (_a = typescript_1.default
        .getLeadingCommentRanges(sourceFile.text, node.getFullStart())) === null || _a === void 0 ? void 0 : _a.map((range) => sourceFile.text.substring(range.pos, range.end)).join("\n")) !== null && _b !== void 0 ? _b : "";
};
exports.getFunctionDocumentation = getFunctionDocumentation;
// Helper to infer types when not explicitly specified
const inferType = (node, checker) => {
    try {
        const type = checker.getTypeAtLocation(node);
        return checker.typeToString(type);
    }
    catch {
        return "any";
    }
};
exports.inferType = inferType;
