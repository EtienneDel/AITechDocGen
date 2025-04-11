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
const core = __importStar(require("@actions/core"));
const github_1 = __importDefault(require("@actions/github"));
const github_2 = require("./github");
const claude_1 = require("./claude");
const typescript_1 = require("./typescript");
async function run() {
    try {
        const claudeApiKey = core.getInput("claude_api_key", { required: true });
        const githubToken = core.getInput("github_token", { required: true });
        const octokit = github_1.default.getOctokit(githubToken);
        // Get changed files in the PR
        const changedFiles = await (0, github_2.getChangedFilesInPR)(octokit, github_1.default.context);
        if (changedFiles.length === 0) {
            core.notice("No TypeScript files were changed in this PR");
            core.setOutput("processed_files", "0");
            core.setOutput("updated_files", "0");
            return;
        }
        core.info(`Found ${changedFiles.length} TypeScript files to process: ${changedFiles.join(", ")}`);
        // Extract functions from the changed files
        const functions = (0, typescript_1.extractFunctions)(changedFiles);
        core.info(`Extracted ${functions.length} functions from ${changedFiles.length} files`);
        if (functions.length === 0) {
            core.notice("No functions found in the changed files");
            core.setOutput("processed_files", changedFiles.length.toString());
            core.setOutput("updated_files", "0");
            return;
        }
        // Generate documentation
        const updatedFunctions = await (0, claude_1.generateDocsForFunctionBatch)(functions, claudeApiKey);
        // Group functions by file
        const functionsByFile = {};
        for (const func of updatedFunctions) {
            if (!functionsByFile[func.filePath]) {
                functionsByFile[func.filePath] = [];
            }
            functionsByFile[func.filePath].push(func);
        }
        // Update PR with documentation
        const { processedFiles, updatedFiles } = await (0, github_2.updatePRWithDocumentation)(updatedFunctions, functionsByFile);
        // Set outputs
        core.setOutput("processed_files", processedFiles.toString());
        core.setOutput("updated_files", updatedFiles.toString());
        core.info(`Successfully added documentation to ${updatedFiles} files`);
    }
    catch (error) {
        // Handle errors
        if (error instanceof Error) {
            core.setFailed(`Action failed with error: ${error.message}`);
        }
        else {
            core.setFailed(`Action failed with unknown error`);
        }
    }
}
run();
