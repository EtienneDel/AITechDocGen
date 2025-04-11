import core from "@actions/core";
import github from "@actions/github";
import { FunctionInfo, GitHubPrOptions } from "../lib/types";

/**
 * Gets the list of changed TypeScript files in the current PR
 */
export async function getChangedFilesInPR(
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context,
): Promise<string[]> {
  const { owner, repo } = context.repo;
  const pull_number = context.payload.pull_request?.number;

  if (!pull_number) {
    core.setFailed("This action must be run in a pull request context");
    return [];
  }

  // Get the list of files changed in the PR
  const response = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number,
  });

  // Get file extensions to filter by
  const fileExtensions = core
    .getInput("file_extensions", { required: false })
    .split(",")
    .map((ext) => ext.trim())
    .filter(Boolean);

  // Filter for TypeScript files that were added or modified (not deleted)
  return response.data
    .filter(
      (file) =>
        (file.status === "added" || file.status === "modified") &&
        fileExtensions.some((ext) => file.filename.endsWith(ext)),
    )
    .map((file) => file.filename);
}

/**
 * Updates documentation in a PR directly with a commit
 */
export async function updatePRWithDocumentation(
  updatedFunctions: FunctionInfo[],
  functionsByFile: Record<string, FunctionInfo[]>,
): Promise<{ processedFiles: number; updatedFiles: number }> {
  const token = core.getInput("github_token", { required: true });
  const octokit = github.getOctokit(token);
  const context = github.context;
  const { owner, repo } = context.repo;

  // Prepare file updates
  const fileUpdates = await prepareFileUpdates(
    updatedFunctions,
    functionsByFile,
  );
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
        ref: context.payload.pull_request?.head.ref,
      });

      if (Array.isArray(fileData)) {
        core.warning(`${fileUpdate.path} is a directory, skipping`);
        continue;
      }

      // If the content hasn't changed, skip this file
      const currentContent = Buffer.from(fileData.content, "base64").toString(
        "utf8",
      );
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
        branch: context.payload.pull_request?.head.ref,
      });

      core.info(`Updated file ${fileUpdate.path} with documentation`);
      updatedFilesCount++;
    } catch (error) {
      core.warning(`Error updating ${fileUpdate.path}: ${error.message}`);
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
export async function createGitHubPullRequest(
  updatedFunctions: FunctionInfo[],
  functionsByFile: Record<string, FunctionInfo[]>,
  options: GitHubPrOptions,
): Promise<void> {
  const { token, baseBranch = "main", prTitle, prBody } = options;

  // Create Octokit instance
  const octokit = github.getOctokit(token);
  const context = github.context;

  // Get repository information from the GitHub Actions context
  const { owner, repo } = context.repo;

  // Create a unique branch name based on timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const branchName = `docs/add-tsdoc-${timestamp}`;

  try {
    core.info(`Creating branch ${branchName} in ${owner}/${repo}`);

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

    core.info(`Created branch ${branchName}`);

    // 3. Generate updated file contents
    const fileUpdates = await prepareFileUpdates(
      updatedFunctions,
      functionsByFile,
    );
    core.info(`Prepared updates for ${fileUpdates.length} files`);

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
      } catch (error) {
        // File doesn't exist yet, which is fine
        core.debug(
          `File ${fileUpdate.path} doesn't exist yet, creating new file`,
        );
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

      core.info(`Updated file ${fileUpdate.path}`);
    }

    // 5. Create a pull request
    const { data: pullRequest } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: prTitle || "Add TsDoc Comments",
      body:
        prBody ||
        "This PR adds TsDoc comments to functions using AI-generated documentation.",
      head: branchName,
      base: baseBranch,
    });

    core.info(`Successfully created pull request: ${pullRequest.html_url}`);
    core.setOutput("pull_request_url", pullRequest.html_url);
    core.setOutput("pull_request_number", pullRequest.number.toString());
  } catch (error) {
    core.setFailed(`Error creating pull request: ${error.message}`);
    throw error;
  }
}
