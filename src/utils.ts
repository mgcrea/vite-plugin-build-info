/**
 * Validates that a string is a valid JavaScript identifier.
 * @param name - The string to validate
 * @returns True if valid, false otherwise
 */
export function isValidIdentifier(name: string): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }
  // Valid JS identifier: starts with letter, $, or _, followed by letters, digits, $, or _
  // Also allows double underscore prefix like __GIT_INFO__
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

/**
 * Creates a debug logger that only logs when debug mode is enabled.
 * @param enabled - Whether debug logging is enabled
 * @returns Logger function
 */
export function createDebugLogger(enabled: boolean): (message: string) => void {
  if (!enabled) {
    return () => {};
  }
  return (message: string) => {
    console.log(`[vite-plugin-git-info] ${message}`);
  };
}

/**
 * Safely retrieves an environment variable value.
 * @param key - Environment variable key
 * @returns The value or undefined
 */
export function getEnvVar(key: string): string | undefined {
  return process.env[key];
}
