import * as core from "@actions/core";
import * as github from "@actions/github";

const getChangedFiles = async (): Promise<string[]> => {
  try {
    // Get token for GitHub API
    const token = core.getInput("github-token");
    const octokit = github.getOctokit(token);

    // Get context info
    const { owner, repo } = github.context.repo;
    const prNumber = github.context.payload.pull_request?.number;

    if (!prNumber) {
      core.info("Not a pull request. Cannot get changed files via GitHub API.");
      return [];
    }

    // Get list of files changed in PR
    const response = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Filter to only include TypeScript files
    const tsFiles = response.data
      .filter(
        (file) =>
          file.filename.endsWith(".ts") || file.filename.endsWith(".tsx"),
      )
      .filter(
        (file) =>
          !file.filename.includes("test.ts") &&
          !file.filename.includes("spec.ts"),
      )
      .map((file) => file.filename);

    core.info(
      `Found ${tsFiles.length} changed TypeScript files in PR #${prNumber}`,
    );
    return tsFiles;
  } catch (error) {
    core.warning(
      `Failed to get changed files: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
};
