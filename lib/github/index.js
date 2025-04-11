"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChangedFilesInPR = getChangedFilesInPR;
exports.updatePRWithDocumentation = updatePRWithDocumentation;
exports.createGitHubPullRequest = createGitHubPullRequest;
const core_1 = __importDefault(require("@actions/core"));
const github_1 = __importDefault(require("@actions/github"));
const generate_docs_1 = require("../generate-docs");
/**
 * Gets the list of changed TypeScript files in the current PR
 */
async function getChangedFilesInPR(octokit, context) {
    var _a;
    const { owner, repo } = context.repo;
    const pull_number = (_a = context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.number;
    if (!pull_number) {
        core_1.default.setFailed("This action must be run in a pull request context");
        return [];
    }
    // Get the list of files changed in the PR
    const response = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number,
    });
    // Get file extensions to filter by
    const fileExtensions = core_1.default
        .getInput("file_extensions", { required: false })
        .split(",")
        .map((ext) => ext.trim())
        .filter(Boolean);
    // Filter for TypeScript files that were added or modified (not deleted)
    return response.data
        .filter((file) => (file.status === "added" || file.status === "modified") &&
        fileExtensions.some((ext) => file.filename.endsWith(ext)))
        .map((file) => file.filename);
}
/**
 * Updates documentation in a PR directly with a commit
 */
async function updatePRWithDocumentation(updatedFunctions, functionsByFile) {
    var _a, _b;
    const token = core_1.default.getInput("github_token", { required: true });
    const octokit = github_1.default.getOctokit(token);
    const context = github_1.default.context;
    const { owner, repo } = context.repo;
    // Prepare file updates
    const fileUpdates = await (0, generate_docs_1.prepareFileUpdates)(updatedFunctions, functionsByFile);
    core_1.default.info(`Prepared updates for ${fileUpdates.length} files`);
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
                core_1.default.warning(`${fileUpdate.path} is not a file, skipping`);
                continue;
            }
            // If the content hasn't changed, skip this file
            const currentContent = Buffer.from(fileData.content, "base64").toString("utf8");
            if (currentContent === fileUpdate.content) {
                core_1.default.info(`No changes needed for ${fileUpdate.path}, skipping`);
                continue;
            }
            // Update the file with new content
            const prTitlePrefix = core_1.default.getInput("pr_title_prefix") || "docs: ";
            await octokit.rest.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: fileUpdate.path,
                message: `${prTitlePrefix}Add TsDoc comments to ${fileUpdate.path}`,
                content: Buffer.from(fileUpdate.content).toString("base64"),
                sha: fileData.sha,
                branch: (_b = context.payload.pull_request) === null || _b === void 0 ? void 0 : _b.head.ref,
            });
            core_1.default.info(`Updated file ${fileUpdate.path} with documentation`);
            updatedFilesCount++;
        }
        catch (error) {
            core_1.default.warning(`Error updating ${fileUpdate.path}: ${error}`);
        }
    }
    return {
        processedFiles: fileUpdates.length,
        updatedFiles: updatedFilesCount,
    };
}
/**
 * Creates a GitHub pull request with the updated documentation using @actions/github
 */
async function createGitHubPullRequest(updatedFunctions, functionsByFile, options) {
    const { token, baseBranch = "main", prTitle, prBody } = options;
    // Create Octokit instance
    const octokit = github_1.default.getOctokit(token);
    // Get repository information from the GitHub Actions context
    const { owner, repo } = github_1.default.context.repo;
    // Create a unique branch name based on timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const branchName = `docs/add-tsdoc-${timestamp}`;
    try {
        core_1.default.info(`Creating branch ${branchName} in ${owner}/${repo}`);
        // 1. Get the reference to the base branch
        const { data: reference } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${baseBranch}`,
        });
        const baseCommitSha = reference.object.sha;
        // 2. Create a new branch
        await octokit.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branchName}`,
            sha: baseCommitSha,
        });
        core_1.default.info(`Created branch ${branchName}`);
        // 3. Generate updated file contents
        const fileUpdates = await (0, generate_docs_1.prepareFileUpdates)(updatedFunctions, functionsByFile);
        core_1.default.info(`Prepared updates for ${fileUpdates.length} files`);
        // 4. Create commits with file changes
        for (const fileUpdate of fileUpdates) {
            let fileSha;
            try {
                // Try to get the current file (if it exists)
                const { data: fileData } = await octokit.rest.repos.getContent({
                    owner,
                    repo,
                    path: fileUpdate.path,
                    ref: branchName,
                });
                if (!Array.isArray(fileData)) {
                    fileSha = fileData.sha;
                }
            }
            catch (error) {
                // File doesn't exist yet, which is fine
                core_1.default.debug(`File ${fileUpdate.path} doesn't exist yet, creating new file`);
            }
            // Create or update the file
            await octokit.rest.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: fileUpdate.path,
                message: `Add TsDoc comments to ${fileUpdate.path}`,
                content: Buffer.from(fileUpdate.content).toString("base64"),
                branch: branchName,
                ...(fileSha ? { sha: fileSha } : {}),
            });
            core_1.default.info(`Updated file ${fileUpdate.path}`);
        }
        // 5. Create a pull request
        const { data: pullRequest } = await octokit.rest.pulls.create({
            owner,
            repo,
            title: prTitle || "Add TsDoc Comments",
            body: prBody ||
                "This PR adds TsDoc comments to functions using AI-generated documentation.",
            head: branchName,
            base: baseBranch,
        });
        core_1.default.info(`Successfully created pull request: ${pullRequest.html_url}`);
        core_1.default.setOutput("pull_request_url", pullRequest.html_url);
        core_1.default.setOutput("pull_request_number", pullRequest.number.toString());
    }
    catch (error) {
        core_1.default.setFailed(`Error creating pull request: ${error}`);
        throw error;
    }
}
