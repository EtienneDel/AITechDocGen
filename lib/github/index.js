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
const getInputs_1 = require("../getInputs");
const getInputFileExtensions = () => (0, getInputs_1.getInputs)()
    .fileExtensions.split(",")
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
const getFilesToCommit = async (octokit, context, fileUpdates) => {
    var _a;
    const { owner, repo } = context.repo;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const ref = (_a = context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.head.ref;
    const treeEntries = await Promise.all(fileUpdates.map(async ({ path, content }) => {
        // Check if file exists and compare content
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref,
            });
            if (!Array.isArray(data) && data.type === "file") {
                const currentContent = Buffer.from(data.content, "base64").toString("utf8");
                if (currentContent === content) {
                    core.info(`No changes needed for ${path}, skipping`);
                    return null;
                }
            }
        }
        catch {
            // File doesn't exist, we'll create it
            core.info(`File ${path} doesn't exist, will create it`);
        }
        core.info(`Prepared ${path} for update`);
        return {
            path,
            mode: "100644",
            type: "blob",
            content,
        };
    }));
    return treeEntries.filter((entry) => entry !== null);
};
/**
 * Updates documentation in a PR directly with a commit
 */
const updatePRWithDocumentation = async (octokit, context, fileUpdates) => {
    var _a;
    const { owner, repo } = context.repo;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const ref = (_a = context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.head.ref;
    if (!ref) {
        throw new Error("Could not determine PR branch reference");
    }
    // Get the current commit SHA of the branch
    const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${ref}`,
    });
    const currentCommitSha = refData.object.sha;
    // Get the current commit to access its tree
    const { data: currentCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha,
    });
    const baseTreeSha = currentCommit.tree.sha;
    const filesToCommit = await getFilesToCommit(octokit, context, fileUpdates);
    // If no files need updating, return early
    if (filesToCommit.length === 0) {
        core.info("No files need updating");
        return {
            processedFiles: fileUpdates.length,
            updatedFiles: 0,
        };
    }
    try {
        // Create a new tree with all the file updates
        const { data: newTree } = await octokit.rest.git.createTree({
            owner,
            repo,
            base_tree: baseTreeSha,
            tree: filesToCommit,
        });
        // Create a new commit with the updated tree
        const commitMessage = `${(0, getInputs_1.getInputs)().prTitlePrefix}Add TsDoc comments to ${filesToCommit.length.toString()} file${filesToCommit.length > 1 ? "s" : ""}`;
        const { data: newCommit } = await octokit.rest.git.createCommit({
            owner,
            repo,
            message: commitMessage,
            tree: newTree.sha,
            parents: [currentCommitSha],
        });
        // Update the branch reference to point to the new commit
        await octokit.rest.git.updateRef({
            owner,
            repo,
            ref: `heads/${ref}`,
            sha: newCommit.sha,
        });
        core.info(`Created commit ${newCommit.sha} with ${filesToCommit.length.toString()} file updates`);
        return {
            processedFiles: fileUpdates.length,
            updatedFiles: filesToCommit.length,
        };
    }
    catch (error) {
        core.error(`Failed to create commit: ${(0, errors_1.getErrorMessage)(error)}`);
        throw error;
    }
};
exports.updatePRWithDocumentation = updatePRWithDocumentation;
