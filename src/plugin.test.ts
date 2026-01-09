import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { gitInfo } from "./plugin.js";
import type { Plugin } from "vite";

describe("gitInfo plugin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set up known env vars for predictable tests
    process.env.GIT_COMMIT = "abc123def456789012345678901234567890abcd";
    process.env.GIT_COMMIT_SHORT = "abc123d";
    process.env.GIT_COMMIT_TIME = "1234567890";
    process.env.GIT_BRANCH = "main";
    process.env.GIT_IS_DIRTY = "false";
    process.env.GIT_LAST_TAG = "v1.0.0";
    process.env.GIT_COMMITS_SINCE_TAG = "5";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return a valid Vite plugin", () => {
    const plugin = gitInfo();

    expect(plugin.name).toBe("vite-plugin-git-info");
    expect(typeof plugin.config).toBe("function");
  });

  it("should inject git info into define config", () => {
    const plugin = gitInfo();
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" }
    );

    expect(config).toBeDefined();
    expect(config?.define).toBeDefined();
    expect(config?.define?.["__GIT_INFO__"]).toBeDefined();

    const buildInfo = JSON.parse(config!.define!["__GIT_INFO__"] as string);
    expect(buildInfo.commitHash).toBe("abc123def456789012345678901234567890abcd");
    expect(buildInfo.commitShort).toBe("abc123d");
    expect(buildInfo.commitTime).toBe("1234567890");
    expect(buildInfo.branch).toBe("main");
    expect(buildInfo.isDirty).toBe(false);
    expect(buildInfo.lastTag).toBe("v1.0.0");
    expect(buildInfo.commitsSinceTag).toBe(5);
  });

  it("should include buildTime in output", () => {
    const plugin = gitInfo();
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" }
    );

    const buildInfo = JSON.parse(config!.define!["__GIT_INFO__"] as string);

    expect(buildInfo.buildTime).toBeDefined();
    expect(typeof buildInfo.buildTime).toBe("string");
    // Should be a valid ISO date string
    expect(new Date(buildInfo.buildTime).toISOString()).toBe(buildInfo.buildTime);
  });

  it("should use custom globalName", () => {
    const plugin = gitInfo({ globalName: "__BUILD_INFO__" });
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" }
    );

    expect(config?.define?.["__BUILD_INFO__"]).toBeDefined();
    expect(config?.define?.["__GIT_INFO__"]).toBeUndefined();
  });

  it("should not inject when define is false", () => {
    const plugin = gitInfo({ define: false });
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" }
    );

    expect(config).toBeUndefined();
  });

  it("should throw error for invalid globalName", () => {
    expect(() => gitInfo({ globalName: "123invalid" })).toThrow(
      'Invalid globalName "123invalid"'
    );
    expect(() => gitInfo({ globalName: "foo-bar" })).toThrow(
      'Invalid globalName "foo-bar"'
    );
    expect(() => gitInfo({ globalName: "" })).toThrow(
      'Invalid globalName ""'
    );
  });

  it("should accept valid globalName variations", () => {
    expect(() => gitInfo({ globalName: "_private" })).not.toThrow();
    expect(() => gitInfo({ globalName: "$jquery" })).not.toThrow();
    expect(() => gitInfo({ globalName: "SCREAMING_CASE" })).not.toThrow();
    expect(() => gitInfo({ globalName: "camelCase" })).not.toThrow();
  });

  it("should pass through git options", () => {
    process.env.BUILD_COMMIT = "custom_commit";
    process.env.BUILD_COMMIT_SHORT = "custom";
    process.env.BUILD_COMMIT_TIME = "9999999999";
    process.env.BUILD_BRANCH = "feature";
    process.env.BUILD_IS_DIRTY = "true";
    process.env.BUILD_LAST_TAG = "v2.0.0";
    process.env.BUILD_COMMITS_SINCE_TAG = "10";

    const plugin = gitInfo({ envPrefix: "BUILD_" });
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" }
    );

    const buildInfo = JSON.parse(config!.define!["__GIT_INFO__"] as string);
    expect(buildInfo.commitHash).toBe("custom_commit");
    expect(buildInfo.isDirty).toBe(true);
    expect(buildInfo.lastTag).toBe("v2.0.0");
  });

  it("should enable debug logging when debug is true", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    gitInfo({ debug: true });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("gitInfo default export", () => {
  it("should work as default export", async () => {
    const { default: gitInfoDefault } = await import("./plugin.js");
    expect(gitInfoDefault).toBe(gitInfo);
  });
});
