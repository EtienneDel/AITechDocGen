import {
  getChangedFilesInPR,
  getInputFileExtensions,
  updatePRWithDocumentation,
} from "../../github";
import {
  getMockOctokit,
  mockContext,
  mockFileContent,
  mockModifiedFileContent,
} from "./mock-data";
import * as core from "@actions/core";
import { Context } from "@actions/github/lib/context";
import { FileUpdates, FunctionsByFile } from "../../lib/types";

jest.mock("@actions/core");

describe("github", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === "file_extensions") {
        return ".ts,.tsx";
      }
      return "";
    });
  });

  it("should return only the file extensions passed as input", () => {
    (core.getInput as jest.Mock).mockReturnValue(
      ".ts,  .tsx  ,notAnExtension, . still not an extension",
    );
    expect(getInputFileExtensions()).toEqual([".ts", ".tsx"]);

    (core.getInput as jest.Mock).mockReturnValue("");
    expect(getInputFileExtensions()).toEqual([]);

    (core.getInput as jest.Mock).mockReturnValue(undefined);
    expect(getInputFileExtensions()).toEqual([]);
  });

  it("should list files added or modified in the current PR", async () => {
    const mockOctokit = getMockOctokit();

    const changedFiles = await getChangedFilesInPR(mockOctokit, mockContext);

    expect(changedFiles).toEqual(["file1.ts", "file2.ts"]);

    const mockOctokit2 = getMockOctokit({
      listFilesMock: {
        data: [],
      },
    });

    const changedFiles2 = await getChangedFilesInPR(mockOctokit2, mockContext);

    expect(changedFiles2).toEqual([]);

    const mockOctokit3 = getMockOctokit({
      listFilesMock: {
        data: undefined,
      },
    });

    const changedFiles3 = await getChangedFilesInPR(mockOctokit3, mockContext);

    expect(changedFiles3).toEqual([]);

    const changedFiles4 = await getChangedFilesInPR(mockOctokit, {
      repo: {
        owner: "testOwner",
        repo: "testRepo",
      },
      payload: {
        pull_request: {
          number: undefined,
        },
      },
    } as unknown as Context);

    expect(changedFiles4).toEqual([]);
  });

  it("should update the PR with documentation", async () => {
    const mockOctokit = getMockOctokit();

    const mockFunctionsByFile: FileUpdates[] = [
      {
        path: "src/test/file.ts",
        content: mockModifiedFileContent,
      },
    ];

    const updatedPR = await updatePRWithDocumentation(
      mockOctokit,
      mockContext,
      mockFunctionsByFile,
    );

    expect(updatedPR).toEqual({
      processedFiles: 1,
      updatedFiles: 1,
    });

    const sameFileContent: FileUpdates[] = [
      {
        path: "src/test/file.ts",
        content: mockFileContent,
      },
    ];

    const updatedPR2 = await updatePRWithDocumentation(
      mockOctokit,
      mockContext,
      sameFileContent,
    );

    expect(updatedPR2).toEqual({
      processedFiles: 1,
      updatedFiles: 0,
    });

    const mockOctokit2 = getMockOctokit({
      getContentMock: { data: { type: "Folder", content: "", sha: "" } },
    });

    const updatedPR3 = await updatePRWithDocumentation(
      mockOctokit2,
      mockContext,
      mockFunctionsByFile,
    );

    expect(updatedPR3).toEqual({
      processedFiles: 1,
      updatedFiles: 0,
    });

    const mockOctokit3 = getMockOctokit({
      createOrUpdateFileContentsMock: jest.fn().mockRejectedValue(false),
    });

    try {
      await updatePRWithDocumentation(
        mockOctokit3,
        mockContext,
        mockFunctionsByFile,
      );

      fail();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
