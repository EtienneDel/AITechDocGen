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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const github_1 = require("./github");
const claude_1 = require("./claude");
const typescript_1 = require("./typescript");
const timer_1 = require("./lib/timer");
const utils_1 = require("./github/utils");
async function run() {
    try {
        (0, timer_1.startTimer)("generateDocumentation");
        const claudeApiKey = core.getInput("claude_api_key", { required: true });
        const githubToken = core.getInput("github_token", { required: true });
        const octokit = github.getOctokit(githubToken);
        // Get changed files in the PR
        const changedFiles = await (0, github_1.getChangedFilesInPR)(octokit, github.context);
        const numberChangedFiles = changedFiles.length;
        if (numberChangedFiles === 0) {
            core.notice("No TypeScript files were changed in this PR");
            core.setOutput("processed_files", "0");
            core.setOutput("updated_files", "0");
            return;
        }
        core.info(`Found ${numberChangedFiles.toString()} TypeScript files to process: ${changedFiles.join(", ")}`);
        // Extract functions from the changed files
        const functions = (0, typescript_1.extractFunctions)(changedFiles);
        if (functions.length === 0) {
            core.notice("No functions found in the changed files");
            core.setOutput("processed_files", numberChangedFiles.toString());
            core.setOutput("updated_files", "0");
            return;
        }
        // Generate documentation
        const functionsByFile = await (0, claude_1.generateDocsForFunctionBatch)(functions, claudeApiKey);
        const fileUpdates = (0, utils_1.prepareFileUpdates)(functionsByFile);
        // Update PR with documentation
        const { processedFiles, updatedFiles } = await (0, github_1.updatePRWithDocumentation)(octokit, github.context, fileUpdates);
        // Set outputs
        core.setOutput("processed_files", processedFiles.toString());
        core.setOutput("updated_files", updatedFiles.toString());
        core.info(`Successfully added documentation to ${updatedFiles.toString()} files`);
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
    finally {
        (0, timer_1.endTimer)("generateDocumentation");
    }
}
run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
