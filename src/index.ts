import { execSync } from "node:child_process";
import type { Plugin } from "vite";

export interface GitInfo {
  commitHash: string;
  commitShort: string;
  commitTime: string;
  branch: string;
}

export interface GitInfoPluginOptions {
  /**
   * The global variable name to use for git info.
   * @default "__GIT_INFO__"
   */
  globalName?: string;

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
  envVars?: {
    commitHash?: string;
    commitShort?: string;
    commitTime?: string;
    branch?: string;
  };

  /**
   * Whether to include the git info in the define config.
   * If false, you can use getGitInfo() to access the info manually.
   * @default true
   */
  define?: boolean;
}

const defaultEnvVars = {
  commitHash: "COMMIT",
  commitShort: "COMMIT_SHORT",
  commitTime: "COMMIT_TIME",
  branch: "BRANCH",
};

/**
 * Get git information from environment variables or git commands.
 */
export function getGitInfo(options: GitInfoPluginOptions = {}): GitInfo {
  const { envPrefix = "GIT_", envVars = {} } = options;
  const vars = { ...defaultEnvVars, ...envVars };

  // First try environment variables (set during Docker build via build args)
  if (envPrefix !== false) {
    const commitHashEnv = process.env[`${envPrefix}${vars.commitHash}`];
    if (commitHashEnv && commitHashEnv !== "unknown") {
      return {
        commitHash: commitHashEnv,
        commitShort: process.env[`${envPrefix}${vars.commitShort}`] ?? "unknown",
        commitTime: process.env[`${envPrefix}${vars.commitTime}`] ?? "0",
        branch: process.env[`${envPrefix}${vars.branch}`] ?? "unknown",
      };
    }
  }

  // Fall back to git commands (works in local dev and CI build steps)
  try {
    return {
      commitHash: execSync("git rev-parse HEAD").toString().trim(),
      commitShort: execSync("git rev-parse --short HEAD").toString().trim(),
      commitTime: execSync("git log -1 --format=%ct").toString().trim(),
      branch: execSync("git rev-parse --abbrev-ref HEAD").toString().trim(),
    };
  } catch {
    return {
      commitHash: "unknown",
      commitShort: "unknown",
      commitTime: "0",
      branch: "unknown",
    };
  }
}

/**
 * Vite plugin that exposes git information as a global variable.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { gitInfo } from "vite-plugin-git-info";
 *
 * export default defineConfig({
 *   plugins: [gitInfo()],
 * });
 * ```
 *
 * @example
 * ```ts
 * // In your app
 * declare const __GIT_INFO__: {
 *   commitHash: string;
 *   commitShort: string;
 *   commitTime: string;
 *   branch: string;
 * };
 *
 * console.log(__GIT_INFO__.commitShort);
 * ```
 */
export function gitInfo(options: GitInfoPluginOptions = {}): Plugin {
  const { globalName = "__GIT_INFO__", define = true } = options;
  const info = getGitInfo(options);

  return {
    name: "vite-plugin-git-info",
    config() {
      if (!define) {
        return;
      }

      return {
        define: {
          [globalName]: JSON.stringify(info),
        },
      };
    },
  };
}

export default gitInfo;
