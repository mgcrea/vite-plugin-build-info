import type { Plugin } from "vite";
import type { BuildInfo, GitInfoPluginOptions } from "./types.js";
import { getGitInfo } from "./git.js";
import { createDebugLogger, isValidIdentifier } from "./utils.js";

/**
 * Creates build info by combining git info with build metadata.
 * @param options - Plugin options
 * @returns Complete build information
 */
function createBuildInfo(options: GitInfoPluginOptions): BuildInfo {
  const gitInfo = getGitInfo(options);

  return {
    ...gitInfo,
    buildTime: new Date().toISOString(),
  };
}

/**
 * Vite plugin that exposes git and build information as a global variable.
 *
 * @param options - Plugin configuration options
 * @returns Vite plugin instance
 * @throws Error if globalName is not a valid JavaScript identifier
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
 *
 * @example
 * ```ts
 * // With custom options
 * export default defineConfig({
 *   plugins: [
 *     gitInfo({
 *       globalName: "__BUILD_INFO__",
 *       envPrefix: "BUILD_",
 *       debug: true,
 *     }),
 *   ],
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
 *   isDirty: boolean;
 *   lastTag: string;
 *   commitsSinceTag: number;
 *   buildTime: string;
 * };
 *
 * console.log(__GIT_INFO__.commitShort);  // "abc1234"
 * console.log(__GIT_INFO__.isDirty);      // false
 * console.log(__GIT_INFO__.buildTime);    // "2024-01-15T10:30:00.000Z"
 * ```
 */
export function gitInfo(options: GitInfoPluginOptions = {}): Plugin {
  const {
    globalName = "__GIT_INFO__",
    define = true,
    debug: debugEnabled = false,
  } = options;

  const debug = createDebugLogger(debugEnabled);

  // Validate globalName
  if (!isValidIdentifier(globalName)) {
    throw new Error(
      `[vite-plugin-git-info] Invalid globalName "${globalName}". Must be a valid JavaScript identifier.`
    );
  }

  const info = createBuildInfo({ ...options, debug: debugEnabled });

  debug(`Build info retrieved: ${JSON.stringify(info)}`);
  debug(`Global name: ${globalName}, define: ${define}`);

  return {
    name: "vite-plugin-git-info",
    config() {
      if (!define) {
        debug("Define disabled, skipping injection");
        return;
      }

      debug(`Injecting ${globalName} into Vite define config`);

      return {
        define: {
          [globalName]: JSON.stringify(info),
        },
      };
    },
  };
}

export default gitInfo;
