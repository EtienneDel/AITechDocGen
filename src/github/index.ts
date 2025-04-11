import * as core from "@actions/core";
import * as github from "@actions/github";
import { FunctionsByFile } from "../lib/types";
import { prepareFileUpdates } from "./utils";

export const getInputFileExtensions = () =>
  core
    .getInput("file_extensions", { required: false })
    ?.split(",")
    .map((ext) => ext.trim())
    .filter((ext) => !!ext?.length && ext.match(/^\.\w+$/gm)) || [];
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

  if (!response?.data?.length) return [];

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
  functionsByFile: FunctionsByFile[],
): Promise<{ processedFiles: number; updatedFiles: number }> => {
  const { owner, repo } = context.repo;

  // Prepare file updates
  const fileUpdates = await prepareFileUpdates(functionsByFile);

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

      if (Array.isArray(fileData) || fileData.type !== "file") {
        core.warning(`${fileUpdate.path} is not a file, skipping`);
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
      core.warning(`Error updating ${fileUpdate.path}: ${error}`);
    }
  }

  return {
    processedFiles: fileUpdates.length,
    updatedFiles: updatedFilesCount,
  };
};
