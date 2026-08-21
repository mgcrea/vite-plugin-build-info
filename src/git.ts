import { execFileSync } from "node:child_process";
import type { GetGitInfoOptions, GitEnvVarNames, GitInfo } from "./types.js";
import { DEFAULT_ENV_VAR_NAMES, UNKNOWN_GIT_INFO } from "./types.js";
import { createDebugLogger, getEnvVar } from "./utils.js";

/** Default timeout for git commands in milliseconds */
const DEFAULT_TIMEOUT = 5000;

/**
 * Git command arguments used to retrieve repository information.
 * Stored as argument arrays so they can be passed to `execFileSync` without a shell.
 */
const GIT_COMMANDS = {
  commitHash: ["rev-parse", "HEAD"],
  commitShort: ["rev-parse", "--short", "HEAD"],
  commitTime: ["log", "-1", "--format=%ct"],
  branch: ["rev-parse", "--abbrev-ref", "HEAD"],
  isDirty: ["status", "--porcelain"],
  lastTag: ["describe", "--tags", "--abbrev=0"],
  totalCommits: ["rev-list", "--count", "HEAD"],
} as const satisfies Record<string, readonly string[]>;

/**
 * Executes a git command and returns the trimmed output.
 *
 * Uses `execFileSync` rather than `execSync` so arguments are never passed
 * through a shell. Git allows `$()`, backticks, `;` and `|` in tag names, so
 * interpolating a tag into a shell string would allow a crafted repository to
 * execute arbitrary commands at build time.
 *
 * @param args - The git arguments to execute
 * @param timeout - Timeout in milliseconds
 * @returns The command output or null if it failed
 */
function execGitCommand(args: readonly string[], timeout: number): string | null {
  try {
    return execFileSync("git", args, {
      encoding: "utf-8",
      timeout,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Parses a commit count, falling back to 0 for missing or malformed values.
 *
 * Guards against `NaN`, which `JSON.stringify` would emit as `null` and break
 * the declared `number` type of `commitsSinceTag` in the injected global.
 *
 * @param value - The raw value to parse
 * @returns A finite commit count
 */
function parseCount(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Environment variables exposing the branch name, in precedence order.
 *
 * Most CI providers check out a detached HEAD, in which case
 * `git rev-parse --abbrev-ref HEAD` reports "HEAD" rather than a branch.
 */
const CI_BRANCH_ENV_VARS = [
  "GITHUB_HEAD_REF", // GitHub Actions (pull requests)
  "GITHUB_REF_NAME", // GitHub Actions (pushes)
  "CI_COMMIT_REF_NAME", // GitLab CI
  "VERCEL_GIT_COMMIT_REF", // Vercel
  "CF_PAGES_BRANCH", // Cloudflare Pages
  "BUILD_SOURCEBRANCHNAME", // Azure Pipelines
] as const;

/**
 * Resolves the current branch, falling back to CI environment variables when
 * the checkout is detached.
 *
 * @param timeout - Timeout in milliseconds
 * @param debug - Debug logger function
 * @returns The branch name, or "unknown" if it cannot be determined
 */
function resolveBranch(timeout: number, debug: (msg: string) => void): string {
  const branch = execGitCommand(GIT_COMMANDS.branch, timeout);

  if (branch && branch !== "HEAD") {
    return branch;
  }

  for (const key of CI_BRANCH_ENV_VARS) {
    const value = getEnvVar(key);
    if (value) {
      debug(`Detached HEAD, using branch from ${key}`);
      return value;
    }
  }

  return branch ?? "unknown";
}

/**
 * Checks if the working tree has uncommitted changes.
 * @param timeout - Timeout in milliseconds
 * @returns True if dirty, false if clean
 */
function checkIsDirty(timeout: number): boolean {
  const output = execGitCommand(GIT_COMMANDS.isDirty, timeout);
  return output !== null && output.length > 0;
}

/**
 * Gets the most recent tag and commits since that tag.
 * @param timeout - Timeout in milliseconds
 * @returns Object with lastTag and commitsSinceTag
 */
function getTagInfo(timeout: number): { lastTag: string; commitsSinceTag: number } {
  const lastTag = execGitCommand(GIT_COMMANDS.lastTag, timeout);

  if (!lastTag) {
    // No tags exist, count total commits
    return {
      lastTag: "",
      commitsSinceTag: parseCount(execGitCommand(GIT_COMMANDS.totalCommits, timeout)),
    };
  }

  // Count commits since the tag
  const count = execGitCommand(["rev-list", "--count", `${lastTag}..HEAD`], timeout);

  return {
    lastTag,
    commitsSinceTag: parseCount(count),
  };
}

/**
 * Attempts to get git information from environment variables.
 * @param envPrefix - The environment variable prefix
 * @param envVars - Custom environment variable names
 * @param debug - Debug logger function
 * @returns GitInfo if found in environment, null otherwise
 */
function getGitInfoFromEnv(
  envPrefix: string,
  envVars: Required<GitEnvVarNames>,
  debug: (msg: string) => void,
): GitInfo | null {
  const commitHashKey = `${envPrefix}${envVars.commitHash}`;
  const commitHash = getEnvVar(commitHashKey);

  if (!commitHash || commitHash === "unknown") {
    debug(`No valid commit hash found in env var ${commitHashKey}`);
    return null;
  }

  debug(`Found git info in environment variables (prefix: ${envPrefix})`);

  const isDirtyEnv = getEnvVar(`${envPrefix}${envVars.isDirty}`);

  return {
    commitHash,
    commitShort: getEnvVar(`${envPrefix}${envVars.commitShort}`) ?? "unknown",
    commitTime: getEnvVar(`${envPrefix}${envVars.commitTime}`) ?? "0",
    branch: getEnvVar(`${envPrefix}${envVars.branch}`) ?? "unknown",
    isDirty: isDirtyEnv === "true" || isDirtyEnv === "1",
    lastTag: getEnvVar(`${envPrefix}${envVars.lastTag}`) ?? "",
    commitsSinceTag: parseCount(getEnvVar(`${envPrefix}${envVars.commitsSinceTag}`)),
  };
}

/**
 * Attempts to get git information by executing git commands.
 * @param timeout - Timeout for each command
 * @param debug - Debug logger function
 * @returns GitInfo from git commands, or unknown values if commands fail
 */
function getGitInfoFromCommands(timeout: number, debug: (msg: string) => void): GitInfo {
  const commitHash = execGitCommand(GIT_COMMANDS.commitHash, timeout);

  if (!commitHash) {
    debug("Git commands failed - not in a git repository or git not available");
    return { ...UNKNOWN_GIT_INFO };
  }

  debug("Retrieved git info from git commands");

  const tagInfo = getTagInfo(timeout);

  return {
    commitHash,
    commitShort: execGitCommand(GIT_COMMANDS.commitShort, timeout) ?? "unknown",
    commitTime: execGitCommand(GIT_COMMANDS.commitTime, timeout) ?? "0",
    branch: resolveBranch(timeout, debug),
    isDirty: checkIsDirty(timeout),
    ...tagInfo,
  };
}

/**
 * Get git information from environment variables or git commands.
 *
 * The function first checks for environment variables (useful in Docker builds
 * where .git directory isn't available), then falls back to executing git commands.
 *
 * @param options - Configuration options
 * @returns Git information object
 *
 * @example
 * ```ts
 * const info = getGitInfo();
 * console.log(info.commitShort); // "abc1234"
 * console.log(info.isDirty);     // false
 * console.log(info.lastTag);     // "v1.0.0"
 * ```
 *
 * @example
 * ```ts
 * // With custom environment variable prefix
 * const info = getGitInfo({ envPrefix: "BUILD_" });
 * // Looks for BUILD_COMMIT, BUILD_BRANCH, etc.
 * ```
 */
export function getGitInfo(options: GetGitInfoOptions = {}): GitInfo {
  const {
    envPrefix = "GIT_",
    envVars = {},
    timeout = DEFAULT_TIMEOUT,
    debug: debugEnabled = false,
  } = options;

  const debug = createDebugLogger(debugEnabled);
  const mergedEnvVars = { ...DEFAULT_ENV_VAR_NAMES, ...envVars };

  // First try environment variables (set during Docker build via build args)
  if (envPrefix !== false) {
    const envInfo = getGitInfoFromEnv(envPrefix, mergedEnvVars, debug);
    if (envInfo) {
      return envInfo;
    }
  } else {
    debug("Environment variable lookup disabled");
  }

  // Fall back to git commands (works in local dev and CI build steps)
  return getGitInfoFromCommands(timeout, debug);
}
