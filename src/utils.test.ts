import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isValidIdentifier, createDebugLogger, getEnvVar } from "./utils.js";

describe("isValidIdentifier", () => {
  it("should accept valid identifiers", () => {
    expect(isValidIdentifier("foo")).toBe(true);
    expect(isValidIdentifier("_foo")).toBe(true);
    expect(isValidIdentifier("$foo")).toBe(true);
    expect(isValidIdentifier("foo123")).toBe(true);
    expect(isValidIdentifier("__GIT_INFO__")).toBe(true);
    expect(isValidIdentifier("camelCase")).toBe(true);
    expect(isValidIdentifier("SCREAMING_SNAKE")).toBe(true);
  });

  it("should reject invalid identifiers", () => {
    expect(isValidIdentifier("")).toBe(false);
    expect(isValidIdentifier("123foo")).toBe(false);
    expect(isValidIdentifier("foo-bar")).toBe(false);
    expect(isValidIdentifier("foo.bar")).toBe(false);
    expect(isValidIdentifier("foo bar")).toBe(false);
    expect(isValidIdentifier("class")).toBe(true); // Reserved words are valid identifiers syntactically
  });

  it("should reject non-string inputs", () => {
    expect(isValidIdentifier(null as unknown as string)).toBe(false);
    expect(isValidIdentifier(undefined as unknown as string)).toBe(false);
    expect(isValidIdentifier(123 as unknown as string)).toBe(false);
  });
});

describe("createDebugLogger", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log when enabled", () => {
    const debug = createDebugLogger(true);
    debug("test message");
    expect(consoleSpy).toHaveBeenCalledWith("[vite-plugin-git-info] test message");
  });

  it("should not log when disabled", () => {
    const debug = createDebugLogger(false);
    debug("test message");
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe("getEnvVar", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return the environment variable value", () => {
    process.env.TEST_VAR = "test_value";
    expect(getEnvVar("TEST_VAR")).toBe("test_value");
  });

  it("should return undefined for non-existent variables", () => {
    delete process.env.NON_EXISTENT;
    expect(getEnvVar("NON_EXISTENT")).toBeUndefined();
  });
});
