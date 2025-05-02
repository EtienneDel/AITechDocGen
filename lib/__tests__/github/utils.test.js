"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../github/utils");
const mock_data_1 = require("./mock-data");
const node_fs_1 = __importDefault(require("node:fs"));
jest.mock("node:fs");
describe("github utils", () => {
    it("should prepare files for update", () => {
        node_fs_1.default.readFileSync.mockReturnValue(mock_data_1.mockFileContent);
        expect((0, utils_1.prepareFileUpdates)([
            { filename: "src/test/file.ts", functions: mock_data_1.mockFunctionInfos },
        ])).toEqual([{ path: "src/test/file.ts", content: mock_data_1.mockModifiedFileContent }]);
    });
    it("should get line indentation", () => {
        expect((0, utils_1.getIndentation)("    export const functionTest = () => {")).toEqual("    ");
        expect((0, utils_1.getIndentation)("export const functionTest = () => {")).toEqual("");
        expect((0, utils_1.getIndentation)("")).toEqual("");
    });
    it("should correctly indent documentation", () => {
        expect((0, utils_1.formatDocumentation)(mock_data_1.doc, "    ")).toEqual(mock_data_1.indentedDoc);
        expect((0, utils_1.formatDocumentation)(mock_data_1.doc2, "    ")).toEqual(mock_data_1.indentedDoc);
        expect((0, utils_1.formatDocumentation)(mock_data_1.doc, "")).toEqual(mock_data_1.doc);
    });
    it("should get spacing lines", () => {
        const lines = mock_data_1.mockFileContent.split("\n");
        expect((0, utils_1.getSpacingLines)(lines)).toEqual(0);
        expect((0, utils_1.getSpacingLines)(lines.slice(6))).toEqual(1);
        expect((0, utils_1.getSpacingLines)(lines.slice(19))).toEqual(1);
        expect((0, utils_1.getSpacingLines)(lines.slice(29))).toEqual(0);
        expect((0, utils_1.getSpacingLines)([])).toEqual(0);
    });
});
