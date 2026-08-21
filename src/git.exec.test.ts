import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGitInfo } from "./git.js";

const execFileSync = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ execFileSync }));

/** A tag name git actually accepts: `$()`, `;` and `|` are all legal in refnames. */
const MALICIOUS_TAG = "v9.9;touch${IFS}pwned";

const COMMIT_HASH = "abc123def456789012345678901234567890abcd";

/** Responds to git invocations keyed by their joined argument list. */
function mockGit(responses: Record<string, string>): void {
  execFileSync.mockImplementation((_file: string, args: readonly string[]) => {
    const key = args.join(" ");
    if (key in responses) {
      return responses[key];
    }
    throw new Error(`unexpected git invocation: ${key}`);
  });
}

describe("git command execution", () => {
  beforeEach(() => {
    execFileSync.mockReset();
  });

  it("should never pass a tag name through a shell", () => {
    mockGit({
      "rev-parse HEAD": COMMIT_HASH,
      "rev-parse --short HEAD": "abc123d",
      "log -1 --format=%ct": "1234567890",
      "rev-parse --abbrev-ref HEAD": "main",
      "status --porcelain": "",
      "describe --tags --abbrev=0": MALICIOUS_TAG,
      [`rev-list --count ${MALICIOUS_TAG}..HEAD`]: "3",
    });

    const info = getGitInfo({ envPrefix: false });

    expect(info.lastTag).toBe(MALICIOUS_TAG);
    expect(info.commitsSinceTag).toBe(3);

    // Every invocation must run `git` directly with an argv array...
    for (const [file, args, options] of execFileSync.mock.calls) {
      expect(file).toBe("git");
      expect(Array.isArray(args)).toBe(true);
      // ...and must never opt into a shell, which would re-expose the injection.
      expect(options?.shell).toBeFalsy();
    }

    // The tag must arrive as a single argv element, not spliced into a command string.
    const revListCall = execFileSync.mock.calls.find(([, args]) => args[0] === "rev-list");
    expect(revListCall?.[1]).toEqual(["rev-list", "--count", `${MALICIOUS_TAG}..HEAD`]);
  });

  it("should fall back to unknown info when git is unavailable", () => {
    execFileSync.mockImplementation(() => {
      throw new Error("git not found");
    });

    expect(getGitInfo({ envPrefix: false })).toEqual({
      commitHash: "unknown",
      commitShort: "unknown",
      commitTime: "0",
      branch: "unknown",
      isDirty: false,
      lastTag: "",
      commitsSinceTag: 0,
    });
  });

  it("should coerce an unparseable commit count to 0 rather than NaN", () => {
    mockGit({
      "rev-parse HEAD": COMMIT_HASH,
      "rev-parse --short HEAD": "abc123d",
      "log -1 --format=%ct": "1234567890",
      "rev-parse --abbrev-ref HEAD": "main",
      "status --porcelain": "",
      "describe --tags --abbrev=0": "v1.0.0",
      "rev-list --count v1.0.0..HEAD": "not-a-number",
    });

    const info = getGitInfo({ envPrefix: false });

    expect(info.commitsSinceTag).toBe(0);
    // NaN would survive the type but serialize to null in the injected global.
    expect(JSON.parse(JSON.stringify(info)).commitsSinceTag).toBe(0);
  });
});
