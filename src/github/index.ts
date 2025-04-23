import * as core from "@actions/core";
import * as github from "@actions/github";
import { FileUpdates } from "../lib/types";
import { getErrorMessage } from "../lib/errors";

export const getInputFileExtensions = () =>
  core
    .getInput("file_extensions", { required: false })
    .split(",")
    .map((ext) => ext.trim())
    .filter((ext) => !!ext.length && ext.match(/^\.\w+$/gm));
/**
 * Gets the list of changed TypeScript files in the current PR
 */
export const getChangedFilesInPR = async (
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context,
): Promise<string[]> => {
  const { owner, repo } = context.repo;
  const pullNumber = context.payload.pull_request?.number;

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

  if (!response.data.length) return [];

  // Filter for TypeScript files that were added or modified (not deleted)
  return response.data
    .filter(
      (file) =>
        (file.status === "added" || file.status === "modified") &&
        getInputFileExtensions().some((ext) => file.filename.endsWith(ext)),
    )
    .map((file) => file.filename);
};

/**
 * Updates documentation in a PR directly with a commit
 */
export const updatePRWithDocumentation = async (
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context,
  fileUpdates: FileUpdates[],
): Promise<{ processedFiles: number; updatedFiles: number }> => {
  const { owner, repo } = context.repo;

  let updatedFilesCount = 0;

  // Process each file update
  for (const { path, content } of fileUpdates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const ref = context.payload.pull_request?.head.ref as string | undefined;

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
      const currentContent = Buffer.from(data.content, "base64").toString(
        "utf8",
      );
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
    } catch (error) {
      core.warning(`Error updating ${path}: ${getErrorMessage(error)}`);
    }
  }

  return {
    processedFiles: fileUpdates.length,
    updatedFiles: updatedFilesCount,
  };
};
