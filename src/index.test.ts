import { describe, expect, it } from "vitest";
import * as exports from "./index.js";
import {
  gitInfo,
  getGitInfo,
  isValidIdentifier,
  UNKNOWN_GIT_INFO,
  DEFAULT_ENV_VAR_NAMES,
} from "./index.js";
import type {
  GitInfo,
  GitEnvVarNames,
  GetGitInfoOptions,
  GitInfoPluginOptions,
} from "./index.js";

describe("public exports", () => {
  it("should export gitInfo function", () => {
    expect(gitInfo).toBeDefined();
    expect(typeof gitInfo).toBe("function");
  });

  it("should export getGitInfo function", () => {
    expect(getGitInfo).toBeDefined();
    expect(typeof getGitInfo).toBe("function");
  });

  it("should export isValidIdentifier function", () => {
    expect(isValidIdentifier).toBeDefined();
    expect(typeof isValidIdentifier).toBe("function");
  });

  it("should export UNKNOWN_GIT_INFO constant", () => {
    expect(UNKNOWN_GIT_INFO).toBeDefined();
    expect(UNKNOWN_GIT_INFO).toEqual({
      commitHash: "unknown",
      commitShort: "unknown",
      commitTime: "0",
      branch: "unknown",
    });
  });

  it("should export DEFAULT_ENV_VAR_NAMES constant", () => {
    expect(DEFAULT_ENV_VAR_NAMES).toBeDefined();
    expect(DEFAULT_ENV_VAR_NAMES).toEqual({
      commitHash: "COMMIT",
      commitShort: "COMMIT_SHORT",
      commitTime: "COMMIT_TIME",
      branch: "BRANCH",
    });
  });

  it("should have default export as gitInfo", () => {
    expect(exports.default).toBe(gitInfo);
  });
});

describe("type exports", () => {
  it("should allow using GitInfo type", () => {
    const info: GitInfo = {
      commitHash: "abc",
      commitShort: "abc",
      commitTime: "123",
      branch: "main",
    };
    expect(info).toBeDefined();
  });

  it("should allow using GitEnvVarNames type", () => {
    const names: GitEnvVarNames = {
      commitHash: "HASH",
    };
    expect(names).toBeDefined();
  });

  it("should allow using GetGitInfoOptions type", () => {
    const options: GetGitInfoOptions = {
      envPrefix: "BUILD_",
      timeout: 1000,
    };
    expect(options).toBeDefined();
  });

  it("should allow using GitInfoPluginOptions type", () => {
    const options: GitInfoPluginOptions = {
      globalName: "__BUILD__",
      define: true,
      debug: false,
    };
    expect(options).toBeDefined();
  });
});
