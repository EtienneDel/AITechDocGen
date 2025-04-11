import { Context } from "@actions/github/lib/context";
import * as github from "@actions/github";

interface GetMockOctokitOptions {
  listFilesMock?: { data: { filename: string; status: string }[] | undefined };
  getContentMock?: {};
}

export const getMockOctokit = ({
  listFilesMock,
  getContentMock,
}: GetMockOctokitOptions = {}) =>
  ({
    rest: {
      pulls: {
        listFiles: jest.fn().mockResolvedValue(
          listFilesMock || {
            data: [
              { filename: "file1.ts", status: "added" },
              { filename: "file2.ts", status: "modified" },
              { filename: "file3.ts", status: "deleted" },
            ],
          },
        ),
      },
      repos: { getContent: jest.fn().mockResolvedValue(getContentMock) },
    },
  }) as unknown as ReturnType<typeof github.getOctokit>;

export const mockContext = {
  repo: {
    owner: "testOwner",
    repo: "testRepo",
  },
  payload: {
    pull_request: {
      number: 123,
    },
  },
} as Context;
