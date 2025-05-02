"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockModifiedFileContent = exports.mockFileContent = exports.mockFunctionInfos = exports.indentedDoc = exports.doc2 = exports.doc = exports.mockContext = exports.getMockOctokit = void 0;
const getMockOctokit = ({ listFilesMock, getContentMock, createOrUpdateFileContentsMock, } = {}) => ({
    rest: {
        pulls: {
            listFiles: jest.fn().mockResolvedValue(listFilesMock || {
                data: [
                    { filename: "file1.ts", status: "added" },
                    { filename: "file2.ts", status: "modified" },
                    { filename: "file3.ts", status: "deleted" },
                ],
            }),
        },
        repos: {
            getContent: jest.fn().mockResolvedValue(getContentMock || {
                data: {
                    type: "file",
                    content: Buffer.from(exports.mockFileContent).toString("base64"),
                    sha: "1234567890",
                },
            }),
            createOrUpdateFileContents: createOrUpdateFileContentsMock || jest.fn().mockResolvedValue(true),
        },
    },
});
exports.getMockOctokit = getMockOctokit;
exports.mockContext = {
    repo: {
        owner: "testOwner",
        repo: "testRepo",
    },
    payload: {
        pull_request: {
            number: 123,
            head: { ref: 123 },
        },
    },
};
exports.doc = `
/**
* Extracts all functions from a list of TypeScript files
*
* @param fileNames Array of file paths to TypeScript files
* @returns Array of extracted function information
*/
`;
exports.doc2 = `
/**
      * Extracts all functions from a list of TypeScript files
*
  * @param fileNames Array of file paths to TypeScript files
    * @returns Array of extracted function information
*/
`;
exports.indentedDoc = `
    /**
    * Extracts all functions from a list of TypeScript files
    *
    * @param fileNames Array of file paths to TypeScript files
    * @returns Array of extracted function information
    */
`;
exports.mockFunctionInfos = [
    {
        name: "testFunction1",
        startLine: 0,
        endLine: 2,
        documentation: "// new documentation",
        isAsync: false,
        isExported: true,
        isGenerator: false,
        body: `
      export const testFunction1 = () => {
        return mock.data
      }`,
        parameters: [],
        returnType: "object",
        filePath: "src/test/file.ts",
    },
    {
        name: "testFunction2",
        startLine: 3,
        endLine: 5,
        documentation: `/**
      * Extracts all functions from a list of TypeScript files
      *
      * @param fileNames Array of file paths to TypeScript files
      * @returns Array of extracted function information
      */`,
        isAsync: false,
        isExported: true,
        isGenerator: false,
        body: `
      export const testFunction2 = () => {
        return mock.data
      }`,
        parameters: [],
        returnType: "object",
        filePath: "src/test/file.ts",
    },
    {
        name: "testFunction3",
        startLine: 7,
        endLine: 9,
        documentation: "",
        isAsync: false,
        isExported: true,
        isGenerator: false,
        body: `
      export const testFunction3 = () => {
        return mock.data
      }`,
        parameters: [],
        returnType: "object",
        filePath: "src/test/file.ts",
    },
    {
        name: "testFunction4",
        startLine: 16,
        endLine: 18,
        documentation: "",
        isAsync: false,
        isExported: true,
        isGenerator: false,
        body: `
      export const testFunction4 = () => {
        return mock.data
      }`,
        parameters: [],
        returnType: "object",
        filePath: "src/test/file.ts",
    },
    {
        name: "testFunction5",
        startLine: 26,
        endLine: 28,
        documentation: `/**
      * Extracts all functions from a list of files
      *
      * @param fileNames Array of file paths to TypeScript files
      * @returns extracted function information
      */`,
        isAsync: false,
        isExported: true,
        isGenerator: false,
        body: `
      export const testFunction5 = () => {
        return mock.data
      }`,
        parameters: [],
        returnType: "object",
        filePath: "src/test/file.ts",
    },
];
exports.mockFileContent = `export const testFunction1 = () => {
    return mock.data
  }
  export const testFunction2 = () => {
    return mock.data
  }
  
  export const testFunction3 = () => {
    return mock.data
  }
  /**
  * Extracts all functions from a list of TypeScript files
  *
  * @param fileNames Array of file paths to TypeScript files
  * @returns Array of extracted function information
  */
  export const testFunction4 = () => {
    return mock.data
  }
  
  /**
  * Extracts all functions from a list of TypeScript files
  *
  * @param fileNames Array of file paths to TypeScript files
  * @returns Array of extracted function information
  */
  export const testFunction5 = () => {
    return mock.data
  }
`;
exports.mockModifiedFileContent = `// new documentation
export const testFunction1 = () => {
    return mock.data
  }
  /**
  * Extracts all functions from a list of TypeScript files
  *
  * @param fileNames Array of file paths to TypeScript files
  * @returns Array of extracted function information
  */
  export const testFunction2 = () => {
    return mock.data
  }
  
  export const testFunction3 = () => {
    return mock.data
  }
  /**
  * Extracts all functions from a list of TypeScript files
  *
  * @param fileNames Array of file paths to TypeScript files
  * @returns Array of extracted function information
  */
  export const testFunction4 = () => {
    return mock.data
  }
  
  /**
  * Extracts all functions from a list of files
  *
  * @param fileNames Array of file paths to TypeScript files
  * @returns extracted function information
  */
  export const testFunction5 = () => {
    return mock.data
  }
`;
