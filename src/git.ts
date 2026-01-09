import { execSync } from "node:child_process";
import type { GetGitInfoOptions, GitInfo } from "./types.js";
import {
  DEFAULT_ENV_VAR_NAMES,
  UNKNOWN_GIT_INFO,
} from "./types.js";
import { createDebugLogger, getEnvVar } from "./utils.js";

/** Default timeout for git commands in milliseconds */
const DEFAULT_TIMEOUT = 5000;

/**
 * Git commands used to retrieve repository information.
 */
const GIT_COMMANDS = {
  commitHash: "git rev-parse HEAD",
  commitShort: "git rev-parse --short HEAD",
  commitTime: "git log -1 --format=%ct",
  branch: "git rev-parse --abbrev-ref HEAD",
  isDirty: "git status --porcelain",
  lastTag: "git describe --tags --abbrev=0",
  commitsSinceTag: "git rev-list --count",
  totalCommits: "git rev-list --count HEAD",
} as const;

/**
 * Executes a git command and returns the trimmed output.
 * @param command - The git command to execute
 * @param timeout - Timeout in milliseconds
 * @returns The command output or null if it failed
 */
function execGitCommand(command: string, timeout: number): string | null {
  try {
    return execSync(command, {
      encoding: "utf-8",
      timeout,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
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
    const totalCommits = execGitCommand(GIT_COMMANDS.totalCommits, timeout);
    return {
      lastTag: "",
      commitsSinceTag: totalCommits ? parseInt(totalCommits, 10) : 0,
    };
  }

  // Count commits since the tag
  const countCommand = `${GIT_COMMANDS.commitsSinceTag} ${lastTag}..HEAD`;
  const count = execGitCommand(countCommand, timeout);

  return {
    lastTag,
    commitsSinceTag: count ? parseInt(count, 10) : 0,
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
  envVars: Required<typeof DEFAULT_ENV_VAR_NAMES>,
  debug: (msg: string) => void
): GitInfo | null {
  const commitHashKey = `${envPrefix}${envVars.commitHash}`;
  const commitHash = getEnvVar(commitHashKey);

  if (!commitHash || commitHash === "unknown") {
    debug(`No valid commit hash found in env var ${commitHashKey}`);
    return null;
  }

  debug(`Found git info in environment variables (prefix: ${envPrefix})`);

  const isDirtyEnv = getEnvVar(`${envPrefix}${envVars.isDirty}`);
  const commitsSinceTagEnv = getEnvVar(`${envPrefix}${envVars.commitsSinceTag}`);

  return {
    commitHash,
    commitShort: getEnvVar(`${envPrefix}${envVars.commitShort}`) ?? "unknown",
    commitTime: getEnvVar(`${envPrefix}${envVars.commitTime}`) ?? "0",
    branch: getEnvVar(`${envPrefix}${envVars.branch}`) ?? "unknown",
    isDirty: isDirtyEnv === "true" || isDirtyEnv === "1",
    lastTag: getEnvVar(`${envPrefix}${envVars.lastTag}`) ?? "",
    commitsSinceTag: commitsSinceTagEnv ? parseInt(commitsSinceTagEnv, 10) : 0,
  };
}

/**
 * Attempts to get git information by executing git commands.
 * @param timeout - Timeout for each command
 * @param debug - Debug logger function
 * @returns GitInfo from git commands, or unknown values if commands fail
 */
function getGitInfoFromCommands(
  timeout: number,
  debug: (msg: string) => void
): GitInfo {
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
    branch: execGitCommand(GIT_COMMANDS.branch, timeout) ?? "unknown",
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
