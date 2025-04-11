"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockContext = exports.getMockOctokit = void 0;
const getMockOctokit = ({ listFilesMock }) => ({
    rest: {
        pulls: {
            listFiles: jest.fn().mockResolvedValue(listFilesMock),
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
        },
    },
};
