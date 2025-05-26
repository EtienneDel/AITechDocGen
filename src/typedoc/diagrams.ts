import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Configuration options for architecture visualization
 */
interface ArchitectureVisualizationOptions {
  /**
   * Directory where TypeDoc generated documentation is stored
   */
  docsDir: string;

  /**
   * Whether to generate class diagrams
   */
  generateClassDiagrams?: boolean;

  /**
   * Whether to generate module dependency diagrams
   */
  generateDependencyDiagrams?: boolean;

  /**
   * Project entry points
   */
  entryPoints: string[];

  /**
   * Output format for diagrams (svg, png, etc.)
   */
  outputFormat?: string;
}

/**
 * Installs required plugins for architecture visualization
 * @param plugins List of plugin names to install
 */
export async function installArchitecturePlugins(
  plugins: string[],
): Promise<void> {
  try {
    for (const plugin of plugins) {
      core.info(`Installing TypeDoc plugin: ${plugin}`);
      await execAsync(`npm install --no-save ${plugin}`);
    }
    core.info("All architecture visualization plugins installed successfully");
  } catch (error) {
    if (error instanceof Error) {
      core.warning(`Failed to install plugins: ${error.message}`);
    } else {
      core.warning("Failed to install plugins due to an unknown error");
    }
    throw error;
  }
}

/**
 * Enhances documentation with architecture visualizations
 * @param options Configuration options for architecture visualization
 */
export async function enhanceWithArchitectureVisualization(
  options: ArchitectureVisualizationOptions,
): Promise<void> {
  const {
    docsDir,
    generateClassDiagrams = true,
    generateDependencyDiagrams = true,
    entryPoints,
    outputFormat = "svg",
  } = options;

  try {
    const visualizationPlugins = [];

    // Add required plugins based on options
    if (generateClassDiagrams) {
      visualizationPlugins.push("typedoc-umlclass");
    }

    if (generateDependencyDiagrams) {
      visualizationPlugins.push("typedoc-plugin-dependency-cruiser");
    }

    // Always add Mermaid for general diagrams
    if (!visualizationPlugins.includes("typedoc-plugin-mermaid")) {
      visualizationPlugins.push("typedoc-plugin-mermaid");
    }

    // Install required plugins if they're not already installed
    await installArchitecturePlugins(visualizationPlugins);

    // Create a diagrams directory inside the docs directory
    const diagramsDir = path.join(docsDir, "diagrams");
    if (!fs.existsSync(diagramsDir)) {
      fs.mkdirSync(diagramsDir, { recursive: true });
    }

    core.info("Architecture visualizations generated successfully");
  } catch (error) {
    if (error instanceof Error) {
      core.warning(
        `Failed to generate architecture visualizations: ${error.message}`,
      );
    } else {
      core.warning(
        "Failed to generate architecture visualizations due to an unknown error",
      );
    }
  }
}
