/**
 * @packageDocumentation
 * Vite plugin that exposes git and build information as a global variable.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { buildInfo } from "@mgcrea/vite-plugin-build-info";
 *
 * export default defineConfig({
 *   plugins: [buildInfo()],
 * });
 * ```
 */

// Types
export type {
  GitInfo,
  BuildInfo,
  GitEnvVarNames,
  GetGitInfoOptions,
  BuildInfoPluginOptions,
  /** @deprecated Use BuildInfoPluginOptions instead */
  GitInfoPluginOptions,
} from "./types.js";

export { UNKNOWN_GIT_INFO, DEFAULT_ENV_VAR_NAMES } from "./types.js";

// Core functionality
export { getGitInfo } from "./git.js";

// Plugin
export { buildInfo } from "./plugin.js";

// Utilities (for advanced usage)
export { isValidIdentifier } from "./utils.js";

// Default export
export { default } from "./plugin.js";
