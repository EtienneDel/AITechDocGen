"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.installArchitecturePlugins = installArchitecturePlugins;
exports.enhanceWithArchitectureVisualization = enhanceWithArchitectureVisualization;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Installs required plugins for architecture visualization
 * @param plugins List of plugin names to install
 */
async function installArchitecturePlugins(plugins) {
    try {
        for (const plugin of plugins) {
            core.info(`Installing TypeDoc plugin: ${plugin}`);
            await execAsync(`npm install --no-save ${plugin}`);
        }
        core.info("All architecture visualization plugins installed successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            core.warning(`Failed to install plugins: ${error.message}`);
        }
        else {
            core.warning("Failed to install plugins due to an unknown error");
        }
        throw error;
    }
}
/**
 * Enhances documentation with architecture visualizations
 * @param options Configuration options for architecture visualization
 */
async function enhanceWithArchitectureVisualization(options) {
    const { docsDir, generateClassDiagrams = true, generateDependencyDiagrams = true, entryPoints, outputFormat = "svg", } = options;
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
    }
    catch (error) {
        if (error instanceof Error) {
            core.warning(`Failed to generate architecture visualizations: ${error.message}`);
        }
        else {
            core.warning("Failed to generate architecture visualizations due to an unknown error");
        }
    }
}
