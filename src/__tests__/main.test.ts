import * as process from "process";
import * as path from "path";
import * as core from "@actions/core";

// Mock the core module
jest.mock("@actions/core");

describe("Documentation Generator Action", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.OPENAI_API_KEY = "mock-api-key";
  });

  test("throws error if source directory does not exist", async () => {
    // Mock inputs
    jest.spyOn(core, "getInput").mockImplementation((name: string): string => {
      if (name === "source-dir") return "non-existent-dir";
      if (name === "output-dir") return "out";
      if (name === "openai-api-key") return "test-key";
      return "";
    });

    const setFailedMock = jest.spyOn(core, "setFailed");

    // Run the action
    await require("../main");

    // Verify it called setFailed
    expect(setFailedMock).toHaveBeenCalled();
  });
});
