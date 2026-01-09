/**
 * Git information structure.
 */
export interface GitInfo {
  /** Full commit SHA hash */
  commitHash: string;
  /** Short commit SHA (7 characters) */
  commitShort: string;
  /** Unix timestamp of the commit */
  commitTime: string;
  /** Current branch name */
  branch: string;
  /** Whether the working tree has uncommitted changes */
  isDirty: boolean;
  /** Most recent tag, or empty string if none */
  lastTag: string;
  /** Number of commits since the last tag, or total commits if no tag */
  commitsSinceTag: number;
}

/**
 * Build information structure (includes git info + build metadata).
 */
export interface BuildInfo extends GitInfo {
  /** Package name from package.json */
  name: string;
  /** Package version from package.json */
  version: string;
  /** ISO 8601 timestamp when the build was created */
  buildTime: string;
}

/**
 * Environment variable name mapping for git properties.
 */
export interface GitEnvVarNames {
  commitHash?: string;
  commitShort?: string;
  commitTime?: string;
  branch?: string;
  isDirty?: string;
  lastTag?: string;
  commitsSinceTag?: string;
}

/**
 * Options for getting git information.
 */
export interface GetGitInfoOptions {
  /**
   * Environment variable prefix for git info (used in Docker builds).
   * Set to false to disable environment variable fallback.
   * @default "GIT_"
   */
  envPrefix?: string | false;

  /**
   * Environment variable names to use for each git property.
   * Only used if envPrefix is not false.
   */
  envVars?: GitEnvVarNames;

  /**
   * Timeout in milliseconds for git commands.
   * @default 5000
   */
  timeout?: number;

  /**
   * Enable debug logging.
   * @default false
   */
  debug?: boolean;
}

/**
 * Plugin configuration options.
 */
export interface BuildInfoPluginOptions extends GetGitInfoOptions {
  /**
   * The global variable name to use for build info.
   * Must be a valid JavaScript identifier.
   * @default "__BUILD_INFO__"
   */
  globalName?: string;

  /**
   * Whether to include the build info in Vite's define config.
   * If false, you can use getGitInfo() to access the info manually.
   * @default true
   */
  define?: boolean;
}

/**
 * @deprecated Use BuildInfoPluginOptions instead
 */
export type GitInfoPluginOptions = BuildInfoPluginOptions;

/**
 * Default values for unknown git information.
 */
export const UNKNOWN_GIT_INFO: GitInfo = {
  commitHash: "unknown",
  commitShort: "unknown",
  commitTime: "0",
  branch: "unknown",
  isDirty: false,
  lastTag: "",
  commitsSinceTag: 0,
} as const;

/**
 * Default environment variable suffixes.
 */
export const DEFAULT_ENV_VAR_NAMES: Required<GitEnvVarNames> = {
  commitHash: "COMMIT",
  commitShort: "COMMIT_SHORT",
  commitTime: "COMMIT_TIME",
  branch: "BRANCH",
  isDirty: "IS_DIRTY",
  lastTag: "LAST_TAG",
  commitsSinceTag: "COMMITS_SINCE_TAG",
} as const;
