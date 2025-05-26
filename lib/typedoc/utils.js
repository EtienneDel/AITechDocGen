"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanDirectory = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
/**
 * Recursively scan directory and collect files
 * @param dir Directory to scan
 * @param baseDir Base directory for relative paths
 * @param fileUpdates
 */
const scanDirectory = (dir, baseDir, fileUpdates = []) => {
    const files = node_fs_1.default.readdirSync(dir);
    for (const file of files) {
        const fullPath = node_path_1.default.join(dir, file);
        const stats = node_fs_1.default.statSync(fullPath);
        if (stats.isDirectory()) {
            (0, exports.scanDirectory)(fullPath, baseDir, fileUpdates);
        }
        else {
            const relativePath = node_path_1.default.relative(process.cwd(), fullPath);
            const content = node_fs_1.default.readFileSync(fullPath, "utf8");
            fileUpdates.push({ path: relativePath, content });
        }
    }
    return fileUpdates;
};
exports.scanDirectory = scanDirectory;
