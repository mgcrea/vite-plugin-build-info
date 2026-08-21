/**
 * Reserved words that are syntactically identifier-shaped but cannot be used as
 * a global name. Vite's `define` performs identifier-boundary replacement, so a
 * reserved word would rewrite real language keywords in the output bundle.
 */
const RESERVED_WORDS = new Set([
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

/**
 * Validates that a string is usable as a global variable name.
 *
 * Requires a valid JavaScript identifier that is not a reserved word.
 *
 * @param name - The string to validate
 * @returns True if valid, false otherwise
 */
export function isValidIdentifier(name: string): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }
  if (RESERVED_WORDS.has(name)) {
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
    console.log(`[vite-plugin-build-info] ${message}`);
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
