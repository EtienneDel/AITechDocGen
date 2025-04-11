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
exports.prepareFileUpdates = prepareFileUpdates;
const fs = __importStar(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
/**
 * Prepares file updates for GitHub PR
 */
async function prepareFileUpdates(updatedFunctions, functionsByFile) {
    const fileUpdates = [];
    // Process each file
    for (const filePath of Object.keys(functionsByFile)) {
        // Read the original file
        const fileContent = fs.readFileSync(filePath, "utf8");
        const lines = fileContent.split("\n");
        // Get functions for this file
        const fileFunctions = updatedFunctions.filter((f) => f.filePath === filePath);
        // Sort functions by start line in descending order to avoid position shifts
        fileFunctions.sort((a, b) => b.startLine - a.startLine);
        // Insert documentation for each function
        for (const func of fileFunctions) {
            if (!func.documentation)
                continue;
            // Calculate the position where the documentation should be inserted
            const insertPosition = getInsertPosition(lines, func.startLine);
            // Format the documentation with proper indentation
            const indentation = getIndentation(lines[func.startLine]);
            const formattedDoc = formatDocumentation(func.documentation, indentation);
            // Insert the documentation
            lines.splice(insertPosition, 0, formattedDoc);
        }
        // Convert relative path for GitHub
        const relativePath = node_path_1.default.relative(process.cwd(), filePath);
        fileUpdates.push({
            path: relativePath,
            content: lines.join("\n"),
        });
    }
    return fileUpdates;
}
/**
 * Determines the correct position to insert documentation
 */
function getInsertPosition(lines, functionStartLine) {
    // Check previous lines for existing comments or decorators
    let currentLine = functionStartLine - 1;
    while (currentLine >= 0) {
        const line = lines[currentLine].trim();
        // If we find a non-empty line that isn't a comment or decorator, stop
        if (line &&
            !line.startsWith("//") &&
            !line.startsWith("/*") &&
            !line.startsWith("*") &&
            !line.startsWith("@")) {
            break;
        }
        // Skip existing TSDoc comments
        if (line.startsWith("/**")) {
            // Skip the entire comment block
            while (currentLine >= 0 && !lines[currentLine].includes("*/")) {
                currentLine--;
            }
            if (currentLine >= 0) {
                currentLine--; // Skip the closing */
            }
            continue;
        }
        currentLine--;
    }
    return currentLine + 1;
}
/**
 * Gets the indentation from a line of code
 */
function getIndentation(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : "";
}
/**
 * Formats documentation with proper indentation
 */
function formatDocumentation(documentation, indentation) {
    return documentation
        .split("\n")
        .map((line, index) => {
        if (index === 0)
            return indentation + line;
        return indentation + line;
    })
        .join("\n");
}
