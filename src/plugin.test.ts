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

    const gitInfoValue = JSON.parse(config!.define!["__GIT_INFO__"] as string);
    expect(gitInfoValue.commitHash).toBe("abc123def456789012345678901234567890abcd");
    expect(gitInfoValue.commitShort).toBe("abc123d");
    expect(gitInfoValue.commitTime).toBe("1234567890");
    expect(gitInfoValue.branch).toBe("main");
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

    const plugin = gitInfo({ envPrefix: "BUILD_" });
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" }
    );

    const gitInfoValue = JSON.parse(config!.define!["__GIT_INFO__"] as string);
    expect(gitInfoValue.commitHash).toBe("custom_commit");
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
