import type { Plugin } from "vite";
import type { BuildInfo, BuildInfoPluginOptions } from "./types.js";
import { getGitInfo } from "./git.js";
import { createDebugLogger, isValidIdentifier } from "./utils.js";

/**
 * Creates build info by combining git info with build metadata.
 * @param options - Plugin options
 * @returns Complete build information
 */
function createBuildInfo(options: BuildInfoPluginOptions): BuildInfo {
  const gitInfo = getGitInfo(options);

  return {
    name: process.env.npm_package_name ?? "",
    version: process.env.npm_package_version ?? "",
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
 * import { buildInfo } from "@mgcrea/vite-plugin-build-info";
 *
 * export default defineConfig({
 *   plugins: [buildInfo()],
 * });
 * ```
 *
 * @example
 * ```ts
 * // With custom options
 * export default defineConfig({
 *   plugins: [
 *     buildInfo({
 *       globalName: "__APP_INFO__",
 *       envPrefix: "CI_",
 *       debug: true,
 *     }),
 *   ],
 * });
 * ```
 *
 * @example
 * ```ts
 * // In your app
 * declare const __BUILD_INFO__: {
 *   name: string;
 *   version: string;
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
 * console.log(__BUILD_INFO__.name);         // "my-app"
 * console.log(__BUILD_INFO__.version);      // "1.2.3"
 * console.log(__BUILD_INFO__.commitShort);  // "abc1234"
 * ```
 */
export function buildInfo(options: BuildInfoPluginOptions = {}): Plugin {
  const { globalName = "__BUILD_INFO__", define = true, debug: debugEnabled = false } = options;

  const debug = createDebugLogger(debugEnabled);

  // Validate globalName
  if (!isValidIdentifier(globalName)) {
    throw new Error(
      `[vite-plugin-build-info] Invalid globalName "${globalName}". Must be a valid JavaScript identifier.`,
    );
  }

  const info = createBuildInfo({ ...options, debug: debugEnabled });

  debug(`Build info retrieved: ${JSON.stringify(info)}`);
  debug(`Global name: ${globalName}, define: ${define}`);

  return {
    name: "vite-plugin-build-info",
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

export default buildInfo;
