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
exports.getChangedFilesInPR = exports.getInputFileExtensions = void 0;
exports.updatePRWithDocumentation = updatePRWithDocumentation;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const utils_1 = require("./utils");
const getInputFileExtensions = () => {
    var _a;
    return ((_a = core
        .getInput("file_extensions", { required: false })) === null || _a === void 0 ? void 0 : _a.split(",").map((ext) => ext.trim()).filter((ext) => !!(ext === null || ext === void 0 ? void 0 : ext.length) && ext.match(/^\.\w+$/gm))) || [];
};
exports.getInputFileExtensions = getInputFileExtensions;
/**
 * Gets the list of changed TypeScript files in the current PR
 */
const getChangedFilesInPR = async (octokit, context) => {
    var _a;
    const { owner, repo } = context.repo;
    const pullNumber = (_a = context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.number;
    if (!pullNumber) {
        core.setFailed("This action must be run in a pull request context");
        return [];
    }
    // Get the list of files changed in the PR
    const response = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
    });
    // Filter for TypeScript files that were added or modified (not deleted)
    return response.data
        .filter((file) => (file.status === "added" || file.status === "modified") &&
        (0, exports.getInputFileExtensions)().some((ext) => file.filename.endsWith(ext)))
        .map((file) => file.filename);
};
exports.getChangedFilesInPR = getChangedFilesInPR;
/**
 * Updates documentation in a PR directly with a commit
 */
async function updatePRWithDocumentation(updatedFunctions, functionsByFile) {
    var _a, _b;
    const token = core.getInput("github_token", { required: true });
    const octokit = github.getOctokit(token);
    const context = github.context;
    const { owner, repo } = context.repo;
    // Prepare file updates
    const fileUpdates = await (0, utils_1.prepareFileUpdates)(updatedFunctions, functionsByFile);
    core.info(`Prepared updates for ${fileUpdates.length} files`);
    let updatedFilesCount = 0;
    // Process each file update
    for (const fileUpdate of fileUpdates) {
        try {
            // Get the current file content and its SHA
            const { data: fileData } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: fileUpdate.path,
                ref: (_a = context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.head.ref,
            });
            if (Array.isArray(fileData) || fileData.type !== "file") {
                core.warning(`${fileUpdate.path} is not a file, skipping`);
                continue;
            }
            // If the content hasn't changed, skip this file
            const currentContent = Buffer.from(fileData.content, "base64").toString("utf8");
            if (currentContent === fileUpdate.content) {
                core.info(`No changes needed for ${fileUpdate.path}, skipping`);
                continue;
            }
            // Update the file with new content
            const prTitlePrefix = core.getInput("pr_title_prefix") || "docs: ";
            await octokit.rest.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: fileUpdate.path,
                message: `${prTitlePrefix}Add TsDoc comments to ${fileUpdate.path}`,
                content: Buffer.from(fileUpdate.content).toString("base64"),
                sha: fileData.sha,
                branch: (_b = context.payload.pull_request) === null || _b === void 0 ? void 0 : _b.head.ref,
            });
            core.info(`Updated file ${fileUpdate.path} with documentation`);
            updatedFilesCount++;
        }
        catch (error) {
            core.warning(`Error updating ${fileUpdate.path}: ${error}`);
        }
    }
    return {
        processedFiles: fileUpdates.length,
        updatedFiles: updatedFilesCount,
    };
}
