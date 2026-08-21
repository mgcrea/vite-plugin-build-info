import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildInfo } from "./plugin.js";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { Plugin, UserConfig } from "vite";

type ConfigHookResult = Omit<UserConfig, "plugins"> | null | void;

/**
 * Invokes a plugin's `config` hook.
 *
 * Vite types `config` as an ObjectHook, so it is either the function itself or
 * a `{ handler }` wrapper; unwrap it rather than asserting it is callable.
 */
function callConfigHook(plugin: Plugin, userConfig: UserConfig = {}): ConfigHookResult {
  const hook = plugin.config;
  const handler = typeof hook === "function" ? hook : hook?.handler;
  if (!handler) {
    throw new Error("plugin does not define a config hook");
  }
  return handler.call(undefined as never, userConfig, {
    command: "build",
    mode: "production",
  }) as ConfigHookResult;
}

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
    expect(plugin.config).toBeDefined();
  });

  it("should inject build info into define config with __BUILD_INFO__ as default", () => {
    const plugin = buildInfo();
    const config = callConfigHook(plugin);

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
    const config = callConfigHook(plugin);

    const info = JSON.parse(config!.define!["__BUILD_INFO__"] as string);

    expect(info.buildTime).toBeDefined();
    expect(typeof info.buildTime).toBe("string");
    // Should be a valid ISO date string
    expect(new Date(info.buildTime).toISOString()).toBe(info.buildTime);
  });

  it("should include package name and version from npm env vars", () => {
    const plugin = buildInfo();
    const config = callConfigHook(plugin);

    const info = JSON.parse(config!.define!["__BUILD_INFO__"] as string);

    expect(info.name).toBe("test-app");
    expect(info.version).toBe("1.2.3");
  });

  it("should fall back to package.json when npm env vars are not set", () => {
    delete process.env.npm_package_name;
    delete process.env.npm_package_version;

    const plugin = buildInfo();
    const config = callConfigHook(plugin);

    const info = JSON.parse(config!.define!["__BUILD_INFO__"] as string);

    // Should read from the project's own package.json
    expect(info.name).toBe("@mgcrea/vite-plugin-build-info");
    expect(info.version).toBeTruthy();
  });

  it("should use custom globalName", () => {
    const plugin = buildInfo({ globalName: "__APP_INFO__" });
    const config = callConfigHook(plugin);

    expect(config?.define?.["__APP_INFO__"]).toBeDefined();
    expect(config?.define?.["__BUILD_INFO__"]).toBeUndefined();
  });

  it("should not inject when define is false", () => {
    const plugin = buildInfo({ define: false });
    const config = callConfigHook(plugin);

    expect(config).toBeUndefined();
  });

  it("should resolve package.json from the Vite root, not the process cwd", () => {
    delete process.env.npm_package_name;
    delete process.env.npm_package_version;

    const plugin = buildInfo();
    // A root with no package.json must not silently inherit the cwd's package.
    const config = callConfigHook(plugin, { root: resolve(tmpdir(), "vite-plugin-build-info-nx") });

    const info = JSON.parse(config!.define!["__BUILD_INFO__"] as string);
    expect(info.name).toBe("");
    expect(info.version).toBe("");
  });

  it("should not gather build info until the config hook runs", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const plugin = buildInfo({ debug: true });
    expect(consoleSpy.mock.calls.flat().join("\n")).not.toContain("Build info retrieved");

    callConfigHook(plugin);
    expect(consoleSpy.mock.calls.flat().join("\n")).toContain("Build info retrieved");

    consoleSpy.mockRestore();
  });

  it("should throw error for invalid globalName", () => {
    expect(() => buildInfo({ globalName: "123invalid" })).toThrow(
      'Invalid globalName "123invalid"',
    );
    expect(() => buildInfo({ globalName: "foo-bar" })).toThrow('Invalid globalName "foo-bar"');
    expect(() => buildInfo({ globalName: "" })).toThrow('Invalid globalName ""');
    expect(() => buildInfo({ globalName: "class" })).toThrow('Invalid globalName "class"');
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
    const config = callConfigHook(plugin);

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
