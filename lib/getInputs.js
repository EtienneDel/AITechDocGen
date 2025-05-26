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
exports.getInputs = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const getInputs = () => ({
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
exports.getInputs = getInputs;
