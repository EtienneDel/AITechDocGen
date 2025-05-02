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
const github_1 = require("../../github");
const mock_data_1 = require("./mock-data");
const core = __importStar(require("@actions/core"));
jest.mock("@actions/core");
describe("github", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        core.getInput.mockImplementation((name) => {
            if (name === "file_extensions") {
                return ".ts,.tsx";
            }
            return "";
        });
    });
    it("should return only the file extensions passed as input", () => {
        core.getInput.mockReturnValue(".ts,  .tsx  ,notAnExtension, . still not an extension");
        expect((0, github_1.getInputFileExtensions)()).toEqual([".ts", ".tsx"]);
        core.getInput.mockReturnValue("");
        expect((0, github_1.getInputFileExtensions)()).toEqual([]);
        core.getInput.mockReturnValue(undefined);
        expect((0, github_1.getInputFileExtensions)()).toEqual([]);
    });
    it("should list files added or modified in the current PR", async () => {
        const mockOctokit = (0, mock_data_1.getMockOctokit)();
        const changedFiles = await (0, github_1.getChangedFilesInPR)(mockOctokit, mock_data_1.mockContext);
        expect(changedFiles).toEqual(["file1.ts", "file2.ts"]);
        const mockOctokit2 = (0, mock_data_1.getMockOctokit)({
            listFilesMock: {
                data: [],
            },
        });
        const changedFiles2 = await (0, github_1.getChangedFilesInPR)(mockOctokit2, mock_data_1.mockContext);
        expect(changedFiles2).toEqual([]);
        const mockOctokit3 = (0, mock_data_1.getMockOctokit)({
            listFilesMock: {
                data: undefined,
            },
        });
        const changedFiles3 = await (0, github_1.getChangedFilesInPR)(mockOctokit3, mock_data_1.mockContext);
        expect(changedFiles3).toEqual([]);
        const changedFiles4 = await (0, github_1.getChangedFilesInPR)(mockOctokit, {
            repo: {
                owner: "testOwner",
                repo: "testRepo",
            },
            payload: {
                pull_request: {
                    number: undefined,
                },
            },
        });
        expect(changedFiles4).toEqual([]);
    });
    it("should update the PR with documentation", async () => {
        const mockOctokit = (0, mock_data_1.getMockOctokit)();
        const mockFunctionsByFile = [
            {
                path: "src/test/file.ts",
                content: mock_data_1.mockModifiedFileContent,
            },
        ];
        const updatedPR = await (0, github_1.updatePRWithDocumentation)(mockOctokit, mock_data_1.mockContext, mockFunctionsByFile);
        expect(updatedPR).toEqual({
            processedFiles: 1,
            updatedFiles: 1,
        });
        const sameFileContent = [
            {
                path: "src/test/file.ts",
                content: mock_data_1.mockFileContent,
            },
        ];
        const updatedPR2 = await (0, github_1.updatePRWithDocumentation)(mockOctokit, mock_data_1.mockContext, sameFileContent);
        expect(updatedPR2).toEqual({
            processedFiles: 1,
            updatedFiles: 0,
        });
        const mockOctokit2 = (0, mock_data_1.getMockOctokit)({
            getContentMock: { data: { type: "Folder", content: "", sha: "" } },
        });
        const updatedPR3 = await (0, github_1.updatePRWithDocumentation)(mockOctokit2, mock_data_1.mockContext, mockFunctionsByFile);
        expect(updatedPR3).toEqual({
            processedFiles: 1,
            updatedFiles: 0,
        });
        const mockOctokit3 = (0, mock_data_1.getMockOctokit)({
            createOrUpdateFileContentsMock: jest.fn().mockRejectedValue(false),
        });
        try {
            await (0, github_1.updatePRWithDocumentation)(mockOctokit3, mock_data_1.mockContext, mockFunctionsByFile);
            fail();
        }
        catch (e) {
            expect(e).toBeDefined();
        }
    });
});
