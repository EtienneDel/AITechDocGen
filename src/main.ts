import * as core from "@actions/core";
import * as github from "@actions/github";
import { getChangedFilesInPR, updatePRWithDocumentation } from "./github";
import { generateDocsForFunctionBatch } from "./claude";
import { extractFunctions } from "./typescript";
import { endTimer, startTimer } from "./lib/timer";
import { prepareFileUpdates } from "./github/utils";

async function run(): Promise<void> {
  try {
    startTimer("generateDocumentation");
    const claudeApiKey = core.getInput("claude_api_key", { required: true });
    const githubToken = core.getInput("github_token", { required: true });
    const octokit = github.getOctokit(githubToken);

    // Get changed files in the PR
    const changedFiles = await getChangedFilesInPR(octokit, github.context);
    const numberChangedFiles = changedFiles.length;

    if (numberChangedFiles === 0) {
      core.notice("No TypeScript files were changed in this PR");
      core.setOutput("processed_files", "0");
      core.setOutput("updated_files", "0");
      return;
    }

    core.info(
      `Found ${numberChangedFiles.toString()} TypeScript files to process: ${changedFiles.join(", ")}`,
    );

    // Extract functions from the changed files
    const functions = extractFunctions(changedFiles);

    if (functions.length === 0) {
      core.notice("No functions found in the changed files");
      core.setOutput("processed_files", numberChangedFiles.toString());
      core.setOutput("updated_files", "0");
      return;
    }

    // Generate documentation
    const functionsByFile = await generateDocsForFunctionBatch(
      functions,
      claudeApiKey,
    );

    const fileUpdates = prepareFileUpdates(functionsByFile);

    // Update PR with documentation
    const { processedFiles, updatedFiles } = await updatePRWithDocumentation(
      octokit,
      github.context,
      fileUpdates,
    );

    // Set outputs
    core.setOutput("processed_files", processedFiles.toString());
    core.setOutput("updated_files", updatedFiles.toString());

    core.info(
      `Successfully added documentation to ${updatedFiles.toString()} files`,
    );
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`);
    } else {
      core.setFailed(`Action failed with unknown error`);
    }
  } finally {
    endTimer("generateDocumentation");
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
