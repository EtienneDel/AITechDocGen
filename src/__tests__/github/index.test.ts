import {
  getChangedFilesInPR,
  getInputFileExtensions,
  updatePRWithDocumentation,
} from "../../github";
import { getMockOctokit, mockContext } from "./mock-data";
import * as core from "@actions/core";
import { Context } from "@actions/github/lib/context";
import { FunctionInfo } from "../../lib/types";

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
    const mockOctokit = getMockOctokit({});

    const mockUpdatedFunctions: FunctionInfo[] = [];

    const mockFunctionsByFile: Record<string, FunctionInfo[]> = {};

    const updatedPR = await updatePRWithDocumentation(
      mockOctokit,
      mockContext,
      mockUpdatedFunctions,
      mockFunctionsByFile,
    );
  });
});
