import { describe, expect, it } from "vitest";
import * as exports from "./index.js";
import {
  buildInfo,
  getGitInfo,
  isValidIdentifier,
  UNKNOWN_GIT_INFO,
  DEFAULT_ENV_VAR_NAMES,
} from "./index.js";
import type {
  GitInfo,
  BuildInfo,
  GitEnvVarNames,
  GetGitInfoOptions,
  BuildInfoPluginOptions,
} from "./index.js";

describe("public exports", () => {
  it("should export buildInfo function", () => {
    expect(buildInfo).toBeDefined();
    expect(typeof buildInfo).toBe("function");
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
      isDirty: false,
      lastTag: "",
      commitsSinceTag: 0,
    });
  });

  it("should export DEFAULT_ENV_VAR_NAMES constant", () => {
    expect(DEFAULT_ENV_VAR_NAMES).toBeDefined();
    expect(DEFAULT_ENV_VAR_NAMES).toEqual({
      commitHash: "COMMIT",
      commitShort: "COMMIT_SHORT",
      commitTime: "COMMIT_TIME",
      branch: "BRANCH",
      isDirty: "IS_DIRTY",
      lastTag: "LAST_TAG",
      commitsSinceTag: "COMMITS_SINCE_TAG",
    });
  });

  it("should have default export as buildInfo", () => {
    expect(exports.default).toBe(buildInfo);
  });
});

describe("type exports", () => {
  it("should allow using GitInfo type", () => {
    const info: GitInfo = {
      commitHash: "abc",
      commitShort: "abc",
      commitTime: "123",
      branch: "main",
      isDirty: false,
      lastTag: "v1.0.0",
      commitsSinceTag: 5,
    };
    expect(info).toBeDefined();
  });

  it("should allow using BuildInfo type", () => {
    const info: BuildInfo = {
      name: "my-app",
      version: "1.0.0",
      commitHash: "abc",
      commitShort: "abc",
      commitTime: "123",
      branch: "main",
      isDirty: false,
      lastTag: "v1.0.0",
      commitsSinceTag: 5,
      buildTime: new Date().toISOString(),
    };
    expect(info).toBeDefined();
  });

  it("should allow using GitEnvVarNames type", () => {
    const names: GitEnvVarNames = {
      commitHash: "HASH",
      isDirty: "DIRTY",
      lastTag: "TAG",
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

  it("should allow using BuildInfoPluginOptions type", () => {
    const options: BuildInfoPluginOptions = {
      globalName: "__BUILD__",
      define: true,
      debug: false,
    };
    expect(options).toBeDefined();
  });
});
