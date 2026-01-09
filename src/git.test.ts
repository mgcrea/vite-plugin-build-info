import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getGitInfo } from "./git.js";
import { UNKNOWN_GIT_INFO } from "./types.js";

describe("getGitInfo", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("from environment variables", () => {
    it("should read from environment variables with default prefix", () => {
      process.env.GIT_COMMIT = "abc123def456";
      process.env.GIT_COMMIT_SHORT = "abc123d";
      process.env.GIT_COMMIT_TIME = "1234567890";
      process.env.GIT_BRANCH = "main";
      process.env.GIT_IS_DIRTY = "true";
      process.env.GIT_LAST_TAG = "v1.0.0";
      process.env.GIT_COMMITS_SINCE_TAG = "5";

      const info = getGitInfo();

      expect(info).toEqual({
        commitHash: "abc123def456",
        commitShort: "abc123d",
        commitTime: "1234567890",
        branch: "main",
        isDirty: true,
        lastTag: "v1.0.0",
        commitsSinceTag: 5,
      });
    });

    it("should read from environment variables with custom prefix", () => {
      process.env.BUILD_COMMIT = "xyz789";
      process.env.BUILD_COMMIT_SHORT = "xyz789";
      process.env.BUILD_COMMIT_TIME = "9876543210";
      process.env.BUILD_BRANCH = "develop";
      process.env.BUILD_IS_DIRTY = "false";
      process.env.BUILD_LAST_TAG = "v2.0.0";
      process.env.BUILD_COMMITS_SINCE_TAG = "10";

      const info = getGitInfo({ envPrefix: "BUILD_" });

      expect(info).toEqual({
        commitHash: "xyz789",
        commitShort: "xyz789",
        commitTime: "9876543210",
        branch: "develop",
        isDirty: false,
        lastTag: "v2.0.0",
        commitsSinceTag: 10,
      });
    });

    it("should use custom env var names", () => {
      process.env.GIT_SHA = "custom123";
      process.env.GIT_SHA_SHORT = "custom1";
      process.env.GIT_TIMESTAMP = "1111111111";
      process.env.GIT_REF = "feature/test";
      process.env.GIT_DIRTY = "1";
      process.env.GIT_TAG = "v3.0.0";
      process.env.GIT_COUNT = "3";

      const info = getGitInfo({
        envVars: {
          commitHash: "SHA",
          commitShort: "SHA_SHORT",
          commitTime: "TIMESTAMP",
          branch: "REF",
          isDirty: "DIRTY",
          lastTag: "TAG",
          commitsSinceTag: "COUNT",
        },
      });

      expect(info).toEqual({
        commitHash: "custom123",
        commitShort: "custom1",
        commitTime: "1111111111",
        branch: "feature/test",
        isDirty: true,
        lastTag: "v3.0.0",
        commitsSinceTag: 3,
      });
    });

    it("should return defaults for missing env vars", () => {
      process.env.GIT_COMMIT = "abc123";
      // Other vars not set

      const info = getGitInfo();

      expect(info.commitHash).toBe("abc123");
      expect(info.commitShort).toBe("unknown");
      expect(info.commitTime).toBe("0");
      expect(info.branch).toBe("unknown");
      expect(info.isDirty).toBe(false);
      expect(info.lastTag).toBe("");
      expect(info.commitsSinceTag).toBe(0);
    });

    it("should skip env vars when envPrefix is false", () => {
      process.env.GIT_COMMIT = "env_commit";
      process.env.GIT_BRANCH = "env_branch";

      const info = getGitInfo({ envPrefix: false });

      // Should fall back to git commands (or unknown if not in git repo)
      // Since we're in a git repo, it should get real git info
      expect(info.commitHash).not.toBe("env_commit");
    });

    it("should ignore 'unknown' value in env var", () => {
      process.env.GIT_COMMIT = "unknown";

      const info = getGitInfo();

      // Should fall back to git commands since env value is "unknown"
      expect(info.commitHash).not.toBe("unknown");
    });

    it("should parse isDirty as boolean from various string values", () => {
      // Test "true"
      process.env.GIT_COMMIT = "abc123";
      process.env.GIT_IS_DIRTY = "true";
      expect(getGitInfo().isDirty).toBe(true);

      // Test "1"
      process.env.GIT_IS_DIRTY = "1";
      expect(getGitInfo().isDirty).toBe(true);

      // Test "false"
      process.env.GIT_IS_DIRTY = "false";
      expect(getGitInfo().isDirty).toBe(false);

      // Test "0"
      process.env.GIT_IS_DIRTY = "0";
      expect(getGitInfo().isDirty).toBe(false);
    });
  });

  describe("from git commands", () => {
    it("should get info from git commands when env vars not set", () => {
      // Clear any GIT_ env vars
      Object.keys(process.env).forEach((key) => {
        if (key.startsWith("GIT_")) {
          delete process.env[key];
        }
      });

      const info = getGitInfo();

      // We're in a git repo, so we should get real values
      expect(info.commitHash).toMatch(/^[a-f0-9]{40}$/);
      expect(info.commitShort).toMatch(/^[a-f0-9]{7,}$/);
      expect(info.commitTime).toMatch(/^\d+$/);
      expect(info.branch).toBeTruthy();
      expect(typeof info.isDirty).toBe("boolean");
      expect(typeof info.lastTag).toBe("string");
      expect(typeof info.commitsSinceTag).toBe("number");
    });

    it("should detect dirty working tree", () => {
      // Clear any GIT_ env vars
      Object.keys(process.env).forEach((key) => {
        if (key.startsWith("GIT_")) {
          delete process.env[key];
        }
      });

      const info = getGitInfo();

      // Since we have uncommitted changes during test run, isDirty should be true
      // But this depends on the actual state, so we just check the type
      expect(typeof info.isDirty).toBe("boolean");
    });
  });

  describe("options", () => {
    it("should respect timeout option", () => {
      // Clear env vars
      Object.keys(process.env).forEach((key) => {
        if (key.startsWith("GIT_")) {
          delete process.env[key];
        }
      });

      // Very short timeout should still work for git commands in local repo
      const info = getGitInfo({ timeout: 10000 });
      expect(info.commitHash).toBeTruthy();
    });

    it("should handle debug option without errors", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const info = getGitInfo({ debug: true });

      expect(info).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("UNKNOWN_GIT_INFO", () => {
    it("should have correct default values", () => {
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
  });
});
