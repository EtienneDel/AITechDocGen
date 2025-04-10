import * as core from "@actions/core";

async function run(): Promise<void> {
  try {
    // Get inputs from the action
    const sourceDir: string = core.getInput("source-dir");

    // Log action start
    core.info(
      `Starting documentation generation for the following directory: ${sourceDir}`,
    );

    core.info("Documentation generated successfully");
  } catch (error) {
    // Handle errors
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`);
    } else {
      core.setFailed(`Action failed with unknown error`);
    }
  }
}

run();
