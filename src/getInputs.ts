import * as core from "@actions/core";
import * as github from "@actions/github";

export interface Inputs {
  claudeApiKey: string;
  githubToken: string;
  fileExtensions: string;
  prTitlePrefix: string;
  docsDirectory: string;
  entryPoints: string[];
  tsconfig: string;
  plugins: string[];
  theme: string;
  projectName: string;
  excludePrivate: boolean;
  excludeProtected: boolean;
  excludeExternals: boolean;
  excludeInternal: boolean;
  readme: string;
  separateCommits: boolean;
}

export const getInputs = (): Inputs => ({
  claudeApiKey: core.getInput("claude_api_key", { required: true }),
  githubToken: core.getInput("github_token", { required: true }),
  fileExtensions: core.getInput("file_extensions") || "",
  prTitlePrefix: core.getInput("pr_title_prefix") || "docs: ",
  docsDirectory: core.getInput("docs-directory") || "docs",
  entryPoints: core
    .getInput("entry-points")
    .split(",")
    .map((e) => e.trim()),
  tsconfig: core.getInput("tsconfig") || "tsconfig.json",
  plugins: core.getInput("plugins")
    ? core
        .getInput("plugins")
        .split(",")
        .map((p) => p.trim())
    : [],
  theme: core.getInput("theme") || "default",
  projectName: core.getInput("project-name") || github.context.repo.repo,
  excludePrivate: core.getInput("exclude-private") === "true",
  excludeProtected: core.getInput("exclude-protected") === "true",
  excludeExternals: core.getInput("exclude-externals") === "true",
  excludeInternal: core.getInput("exclude-internal") === "true",
  readme: core.getInput("readme") || "README.md",
  separateCommits: core.getInput("separate-commits") === "true",
});
