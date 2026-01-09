/**
 * @packageDocumentation
 * Vite plugin that exposes git information (commit hash, branch, etc.) as a global variable.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { gitInfo } from "@mgcrea/vite-plugin-git-info";
 *
 * export default defineConfig({
 *   plugins: [gitInfo()],
 * });
 * ```
 */

// Types
export type {
  GitInfo,
  GitEnvVarNames,
  GetGitInfoOptions,
  GitInfoPluginOptions,
} from "./types.js";

export { UNKNOWN_GIT_INFO, DEFAULT_ENV_VAR_NAMES } from "./types.js";

// Core functionality
export { getGitInfo } from "./git.js";

// Plugin
export { gitInfo } from "./plugin.js";

// Utilities (for advanced usage)
export { isValidIdentifier } from "./utils.js";

// Default export
export { default } from "./plugin.js";
