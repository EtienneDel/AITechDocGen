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
exports.updatePRWithDocumentation = exports.getChangedFilesInPR = exports.getInputFileExtensions = void 0;
const core = __importStar(require("@actions/core"));
const errors_1 = require("../lib/errors");
const getInputFileExtensions = () => core
    .getInput("file_extensions", { required: false })
    .split(",")
    .map((ext) => ext.trim())
    .filter((ext) => !!ext.length && ext.match(/^\.\w+$/gm));
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
    if (!response.data.length)
        return [];
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
const updatePRWithDocumentation = async (octokit, context, fileUpdates) => {
    var _a;
    const { owner, repo } = context.repo;
    let updatedFilesCount = 0;
    // Process each file update
    for (const { path, content } of fileUpdates) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const ref = (_a = context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.head.ref;
            // Get the current file content and its SHA
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref,
            });
            if (Array.isArray(data) || data.type !== "file") {
                core.warning(`${path} is not a file, skipping`);
                continue;
            }
            // If the content hasn't changed, skip this file
            const currentContent = Buffer.from(data.content, "base64").toString("utf8");
            if (currentContent === content) {
                core.info(`No changes needed for ${path}, skipping`);
                continue;
            }
            // Update the file with new content
            const prTitlePrefix = core.getInput("pr_title_prefix") || "docs: ";
            await octokit.rest.repos.createOrUpdateFileContents({
                owner,
                repo,
                path,
                message: `${prTitlePrefix}Add TsDoc comments to ${path}`,
                content: Buffer.from(content).toString("base64"),
                sha: data.sha,
                branch: ref,
            });
            core.info(`Updated file ${path} with documentation`);
            updatedFilesCount++;
        }
        catch (error) {
            core.warning(`Error updating ${path}: ${(0, errors_1.getErrorMessage)(error)}`);
        }
    }
    return {
        processedFiles: fileUpdates.length,
        updatedFiles: updatedFilesCount,
    };
};
exports.updatePRWithDocumentation = updatePRWithDocumentation;
