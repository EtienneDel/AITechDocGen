import {
  formatDocumentation,
  getIndentation,
  getSpacingLines,
  prepareFileUpdates,
} from "../../github/utils";
import {
  doc,
  indentedDoc,
  mockFunctionInfos,
  mockFileContent,
  mockModifiedFileContent,
  doc2,
} from "./mock-data";
import fs from "node:fs";

jest.mock("node:fs");

describe("github utils", () => {
  it("should prepare files for update", () => {
    (fs.readFileSync as jest.Mock).mockReturnValue(mockFileContent);

    expect(
      prepareFileUpdates([
        { filename: "src/test/file.ts", functions: mockFunctionInfos },
      ]),
    ).toEqual([{ path: "src/test/file.ts", content: mockModifiedFileContent }]);
  });

  it("should get line indentation", () => {
    expect(getIndentation("    export const functionTest = () => {")).toEqual(
      "    ",
    );
    expect(getIndentation("export const functionTest = () => {")).toEqual("");
    expect(getIndentation("")).toEqual("");
  });

  it("should correctly indent documentation", () => {
    expect(formatDocumentation(doc, "    ")).toEqual(indentedDoc);
    expect(formatDocumentation(doc2, "    ")).toEqual(indentedDoc);
    expect(formatDocumentation(doc, "")).toEqual(doc);
  });

  it("should get spacing lines", () => {
    const lines = mockFileContent.split("\n");
    expect(getSpacingLines(lines)).toEqual(0);
    expect(getSpacingLines(lines.slice(6))).toEqual(1);
    expect(getSpacingLines(lines.slice(19))).toEqual(1);
    expect(getSpacingLines(lines.slice(29))).toEqual(0);
    expect(getSpacingLines([])).toEqual(0);
  });
});
