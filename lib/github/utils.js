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
exports.getSpacingLines = exports.formatDocumentation = exports.getIndentation = exports.prepareFileUpdates = void 0;
const fs = __importStar(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const core = __importStar(require("@actions/core"));
/**
 * Prepares file updates for GitHub PR
 */
const prepareFileUpdates = (functionsByFile) => {
    const fileUpdates = [];
    for (const file of functionsByFile) {
        file.functions.sort((a, b) => b.startLine - a.startLine);
        const fileContent = fs.readFileSync(file.filename, "utf8");
        const lines = fileContent.split("\n");
        for (const [index, func] of file.functions.entries()) {
            if (!func.documentation.length)
                continue;
            const previousFunction = index + 1 <= file.functions.length - 1
                ? file.functions[index + 1]
                : undefined;
            core.info(`###### ${index.toString()} ######`);
            core.info(previousFunction
                ? JSON.stringify(previousFunction)
                : "No previous function");
            // Format the documentation with proper indentation
            const indentation = (0, exports.getIndentation)(lines[func.startLine]);
            const formattedDoc = (0, exports.formatDocumentation)(func.documentation, indentation);
            // Insert the documentation
            if (previousFunction) {
                const spacingLines = (0, exports.getSpacingLines)(lines.slice(previousFunction.endLine + 1));
                lines.splice(previousFunction.endLine + 1 + spacingLines, lines.slice(previousFunction.endLine + 1 + spacingLines, func.startLine).length, formattedDoc);
            }
            else {
                lines.splice(func.startLine, lines.slice(0, func.startLine).length, formattedDoc);
            }
        }
        // Convert relative path for GitHub
        const relativePath = node_path_1.default.relative(process.cwd(), file.filename);
        fileUpdates.push({
            path: relativePath,
            content: lines.join("\n"),
        });
    }
    core.info(`Prepared updates for ${fileUpdates.length.toString()} files`);
    return fileUpdates;
};
exports.prepareFileUpdates = prepareFileUpdates;
/**
 * Gets the indentation from a line of code
 */
const getIndentation = (line) => {
    const match = /^(\s*)/.exec(line);
    return match ? match[1] : "";
};
exports.getIndentation = getIndentation;
/**
 * Formats documentation with proper indentation
 */
const formatDocumentation = (documentation, indentation) => {
    return documentation
        .split("\n")
        .map((line) => (line.trim().length ? indentation + line.trim() : line))
        .join("\n");
};
exports.formatDocumentation = formatDocumentation;
const getSpacingLines = (lines) => {
    var _a;
    let i = 0;
    while (!((_a = lines[i]) === null || _a === void 0 ? void 0 : _a.trim().length)) {
        if (!lines[i])
            break;
        i++;
    }
    return i;
};
exports.getSpacingLines = getSpacingLines;
