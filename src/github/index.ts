import * as core from "@actions/core";
import * as github from "@actions/github";
import { FileUpdates, GithubTreeEntry } from "../lib/types";
import { getErrorMessage } from "../lib/errors";
import { getInputs } from "../getInputs";

export const getInputFileExtensions = () =>
  getInputs()
    .fileExtensions.split(",")
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

const getFilesToCommit = async (
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context,
  fileUpdates: FileUpdates[],
): Promise<GithubTreeEntry[]> => {
  const { owner, repo } = context.repo;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const ref = context.payload.pull_request?.head.ref as string | undefined;

  const treeEntries: (GithubTreeEntry | null)[] = await Promise.all(
    fileUpdates.map(async ({ path, content }) => {
      // Check if file exists and compare content
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref,
        });

        if (!Array.isArray(data) && data.type === "file") {
          const currentContent = Buffer.from(data.content, "base64").toString(
            "utf8",
          );
          if (currentContent === content) {
            core.info(`No changes needed for ${path}, skipping`);
            return null;
          }
        }
      } catch {
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
    }),
  );

  return treeEntries.filter((entry) => entry !== null);
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const ref = context.payload.pull_request?.head.ref as string | undefined;

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
    const commitMessage = `${getInputs().prTitlePrefix}Add TsDoc comments to ${filesToCommit.length.toString()} file${filesToCommit.length > 1 ? "s" : ""}`;

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

    core.info(
      `Created commit ${newCommit.sha} with ${filesToCommit.length.toString()} file updates`,
    );

    return {
      processedFiles: fileUpdates.length,
      updatedFiles: filesToCommit.length,
    };
  } catch (error) {
    core.error(`Failed to create commit: ${getErrorMessage(error)}`);
    throw error;
  }
};
