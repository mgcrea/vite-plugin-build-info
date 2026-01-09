import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildInfo } from "./plugin.js";
import type { Plugin } from "vite";

describe("buildInfo plugin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set up known env vars for predictable tests
    process.env.npm_package_name = "test-app";
    process.env.npm_package_version = "1.2.3";
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
    const plugin = buildInfo();

    expect(plugin.name).toBe("vite-plugin-build-info");
    expect(typeof plugin.config).toBe("function");
  });

  it("should inject build info into define config with __BUILD_INFO__ as default", () => {
    const plugin = buildInfo();
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" },
    );

    expect(config).toBeDefined();
    expect(config?.define).toBeDefined();
    expect(config?.define?.["__BUILD_INFO__"]).toBeDefined();

    const info = JSON.parse(config!.define!["__BUILD_INFO__"] as string);
    expect(info.commitHash).toBe("abc123def456789012345678901234567890abcd");
    expect(info.commitShort).toBe("abc123d");
    expect(info.commitTime).toBe("1234567890");
    expect(info.branch).toBe("main");
    expect(info.isDirty).toBe(false);
    expect(info.lastTag).toBe("v1.0.0");
    expect(info.commitsSinceTag).toBe(5);
  });

  it("should include buildTime in output", () => {
    const plugin = buildInfo();
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" },
    );

    const info = JSON.parse(config!.define!["__BUILD_INFO__"] as string);

    expect(info.buildTime).toBeDefined();
    expect(typeof info.buildTime).toBe("string");
    // Should be a valid ISO date string
    expect(new Date(info.buildTime).toISOString()).toBe(info.buildTime);
  });

  it("should include package name and version from npm env vars", () => {
    const plugin = buildInfo();
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" },
    );

    const info = JSON.parse(config!.define!["__BUILD_INFO__"] as string);

    expect(info.name).toBe("test-app");
    expect(info.version).toBe("1.2.3");
  });

  it("should default to empty strings when npm env vars are not set", () => {
    delete process.env.npm_package_name;
    delete process.env.npm_package_version;

    const plugin = buildInfo();
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" },
    );

    const info = JSON.parse(config!.define!["__BUILD_INFO__"] as string);

    expect(info.name).toBe("");
    expect(info.version).toBe("");
  });

  it("should use custom globalName", () => {
    const plugin = buildInfo({ globalName: "__APP_INFO__" });
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" },
    );

    expect(config?.define?.["__APP_INFO__"]).toBeDefined();
    expect(config?.define?.["__BUILD_INFO__"]).toBeUndefined();
  });

  it("should not inject when define is false", () => {
    const plugin = buildInfo({ define: false });
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" },
    );

    expect(config).toBeUndefined();
  });

  it("should throw error for invalid globalName", () => {
    expect(() => buildInfo({ globalName: "123invalid" })).toThrow(
      'Invalid globalName "123invalid"',
    );
    expect(() => buildInfo({ globalName: "foo-bar" })).toThrow('Invalid globalName "foo-bar"');
    expect(() => buildInfo({ globalName: "" })).toThrow('Invalid globalName ""');
  });

  it("should accept valid globalName variations", () => {
    expect(() => buildInfo({ globalName: "_private" })).not.toThrow();
    expect(() => buildInfo({ globalName: "$jquery" })).not.toThrow();
    expect(() => buildInfo({ globalName: "SCREAMING_CASE" })).not.toThrow();
    expect(() => buildInfo({ globalName: "camelCase" })).not.toThrow();
  });

  it("should pass through git options", () => {
    process.env.BUILD_COMMIT = "custom_commit";
    process.env.BUILD_COMMIT_SHORT = "custom";
    process.env.BUILD_COMMIT_TIME = "9999999999";
    process.env.BUILD_BRANCH = "feature";
    process.env.BUILD_IS_DIRTY = "true";
    process.env.BUILD_LAST_TAG = "v2.0.0";
    process.env.BUILD_COMMITS_SINCE_TAG = "10";

    const plugin = buildInfo({ envPrefix: "BUILD_" });
    const config = (plugin.config as NonNullable<Plugin["config"]>)(
      {},
      { command: "build", mode: "production" },
    );

    const info = JSON.parse(config!.define!["__BUILD_INFO__"] as string);
    expect(info.commitHash).toBe("custom_commit");
    expect(info.isDirty).toBe(true);
    expect(info.lastTag).toBe("v2.0.0");
  });

  it("should enable debug logging when debug is true", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    buildInfo({ debug: true });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("buildInfo default export", () => {
  it("should work as default export", async () => {
    const { default: buildInfoDefault } = await import("./plugin.js");
    expect(buildInfoDefault).toBe(buildInfo);
  });
});
