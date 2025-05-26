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
exports.collectDocumentationFiles = exports.generateTypeDocs = void 0;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const getInputs_1 = require("../getInputs");
const utils_1 = require("./utils");
const errors_1 = require("../lib/errors");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Generate documentation using TypeDoc
 * @returns Promise that resolves when documentation is generated
 */
const generateTypeDocs = async () => {
    try {
        const { docsDirectory, entryPoints, plugins, theme, tsconfig, excludePrivate, excludeProtected, excludeExternals, excludeInternal, readme, projectName, } = (0, getInputs_1.getInputs)();
        // Ensure TypeDoc and plugins are installed
        await execAsync("npx typedoc --version").catch(() => {
            core.info("TypeDoc not found, installing...");
            core.info(`Found plugins: ${plugins.join(" ")}, installing...`);
            return execAsync(`npm install --no-save typedoc ${plugins.join(" ")}`);
        });
        // Create output directory if it doesn't exist
        if (!fs.existsSync(docsDirectory)) {
            fs.mkdirSync(docsDirectory, { recursive: true });
            core.info(`Created documentation directory: ${docsDirectory}`);
        }
        // Build TypeDoc command
        let typeDocCommand = "npx typedoc";
        // Add entry points
        entryPoints.forEach((entry) => {
            typeDocCommand += ` "${entry}"`;
        });
        // Add output directory
        typeDocCommand += ` --out "${docsDirectory}"`;
        // Add plugins if specified
        if (plugins.length > 0) {
            for (const plugin of plugins) {
                typeDocCommand += ` --plugin ${plugin}`;
            }
        }
        // Add other options
        if (theme)
            typeDocCommand += ` --theme "${theme}"`;
        if (tsconfig)
            typeDocCommand += ` --tsconfig "${tsconfig}"`;
        if (excludePrivate)
            typeDocCommand += " --excludePrivate";
        if (excludeProtected)
            typeDocCommand += " --excludeProtected";
        if (excludeExternals)
            typeDocCommand += " --excludeExternals";
        if (excludeInternal)
            typeDocCommand += " --excludeInternal";
        if (readme)
            typeDocCommand += ` --readme "${readme}"`;
        if (projectName)
            typeDocCommand += ` --name "${projectName}"`;
        core.info("Generating documentation with TypeDoc...");
        core.debug(`Executing command: ${typeDocCommand}`);
        const { stdout, stderr } = await execAsync(typeDocCommand);
        if (stderr && !stderr.includes("DeprecationWarning")) {
            core.warning(`TypeDoc warnings: ${stderr}`);
        }
        core.info(`TypeDoc output: ${stdout}`);
        core.info("Documentation generated successfully!");
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to generate documentation: ${error.message}`);
        }
        else {
            core.setFailed("Failed to generate documentation due to an unknown error");
        }
        throw error;
    }
};
exports.generateTypeDocs = generateTypeDocs;
/**
 * Collects documentation files and prepares them for commit
 * @returns Array of file objects with path and content for each generated doc file
 */
const collectDocumentationFiles = () => {
    const { docsDirectory } = (0, getInputs_1.getInputs)();
    try {
        core.info(`Collecting documentation files from ${docsDirectory}...`);
        // Ensure docs directory exists
        if (!fs.existsSync(docsDirectory)) {
            core.warning(`Documentation directory ${docsDirectory} does not exist. No files to collect.`);
            return [];
        }
        // Scan the docs directory and collect files
        const fileUpdates = (0, utils_1.scanDirectory)(docsDirectory, process.cwd());
        core.info(`Collected ${fileUpdates.length.toString()} documentation files`);
        return fileUpdates;
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to collect documentation files: ${(0, errors_1.getErrorMessage)(error)}`);
        }
        else {
            core.setFailed("Failed to collect documentation files due to an unknown error");
        }
        throw error;
    }
};
exports.collectDocumentationFiles = collectDocumentationFiles;
