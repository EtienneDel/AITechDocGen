import * as core from "@actions/core";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { FileUpdates } from "../lib/types";
import { getInputs } from "../getInputs";
import { scanDirectory } from "./utils";
import { getErrorMessage } from "../lib/errors";

const execAsync = promisify(exec);

/**
 * Generate documentation using TypeDoc
 * @returns Promise that resolves when documentation is generated
 */
export const generateTypeDocs = async (): Promise<void> => {
  try {
    const {
      docsDirectory,
      entryPoints,
      plugins,
      theme,
      tsconfig,
      excludePrivate,
      excludeProtected,
      excludeExternals,
      excludeInternal,
      readme,
      projectName,
    } = getInputs();

    // Ensure TypeDoc and plugins are installed
    await execAsync("npx typedoc --version").catch(() => {
      core.info("TypeDoc not found, installing...");
      core.info(`Found plugins: ${plugins.join(" ")}, installing...`);
      return execAsync(`npm install --no-save typedoc ${plugins.join(" ")}`);
    });

    // Create output directory if it doesn't exist
    if (!fs.existsSync(docsDirectory)) {
      fs.mkdirSync(docsDirectory, { recursive: true });
      core.info(`Created documentation directory: ${docsDirectory}`);
    }

    // Build TypeDoc command
    let typeDocCommand = "npx typedoc";

    // Add entry points
    entryPoints.forEach((entry) => {
      typeDocCommand += ` "${entry}"`;
    });

    // Add output directory
    typeDocCommand += ` --out "${docsDirectory}"`;

    // Add plugins if specified
    if (plugins.length > 0) {
      for (const plugin of plugins) {
        typeDocCommand += ` --plugin ${plugin}`;
      }
    }

    // Add other options
    if (theme) typeDocCommand += ` --theme "${theme}"`;
    if (tsconfig) typeDocCommand += ` --tsconfig "${tsconfig}"`;
    if (excludePrivate) typeDocCommand += " --excludePrivate";
    if (excludeProtected) typeDocCommand += " --excludeProtected";
    if (excludeExternals) typeDocCommand += " --excludeExternals";
    if (excludeInternal) typeDocCommand += " --excludeInternal";
    if (readme) typeDocCommand += ` --readme "${readme}"`;
    if (projectName) typeDocCommand += ` --name "${projectName}"`;

    core.info("Generating documentation with TypeDoc...");
    core.debug(`Executing command: ${typeDocCommand}`);

    const { stdout, stderr } = await execAsync(typeDocCommand);

    if (stderr && !stderr.includes("DeprecationWarning")) {
      core.warning(`TypeDoc warnings: ${stderr}`);
    }

    core.info(`TypeDoc output: ${stdout}`);
    core.info("Documentation generated successfully!");
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to generate documentation: ${error.message}`);
    } else {
      core.setFailed(
        "Failed to generate documentation due to an unknown error",
      );
    }
    throw error;
  }
};

/**
 * Collects documentation files and prepares them for commit
 * @returns Array of file objects with path and content for each generated doc file
 */
export const collectDocumentationFiles = (): FileUpdates[] => {
  const { docsDirectory } = getInputs();
  try {
    core.info(`Collecting documentation files from ${docsDirectory}...`);

    // Ensure docs directory exists
    if (!fs.existsSync(docsDirectory)) {
      core.warning(
        `Documentation directory ${docsDirectory} does not exist. No files to collect.`,
      );
      return [];
    }

    // Scan the docs directory and collect files
    const fileUpdates = scanDirectory(docsDirectory, process.cwd());

    core.info(`Collected ${fileUpdates.length.toString()} documentation files`);
    return fileUpdates;
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(
        `Failed to collect documentation files: ${getErrorMessage(error)}`,
      );
    } else {
      core.setFailed(
        "Failed to collect documentation files due to an unknown error",
      );
    }
    throw error;
  }
};
