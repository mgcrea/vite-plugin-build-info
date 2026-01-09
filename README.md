# vite-plugin-git-info

A Vite plugin that exposes git and build information as a global variable in your application. Perfect for displaying version information, build timestamps, and tracking deployments.

## Features

- **Git Information**: Commit hash, branch, timestamp
- **Build Metadata**: Build timestamp, dirty status
- **Version Tracking**: Latest tag and commits since tag
- **Docker/CI Support**: Environment variable fallback when `.git` isn't available
- **TypeScript**: Full type definitions included
- **Zero Dependencies**: Lightweight with no runtime dependencies

## Installation

```bash
npm install @mgcrea/vite-plugin-git-info --save-dev
# or
pnpm add -D @mgcrea/vite-plugin-git-info
# or
yarn add -D @mgcrea/vite-plugin-git-info
```

## Usage

### Basic Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { gitInfo } from "@mgcrea/vite-plugin-git-info";

export default defineConfig({
  plugins: [gitInfo()],
});
```

Then in your application:

```ts
// Add type declaration (or add to a .d.ts file)
declare const __GIT_INFO__: {
  commitHash: string;
  commitShort: string;
  commitTime: string;
  branch: string;
  isDirty: boolean;
  lastTag: string;
  commitsSinceTag: number;
  buildTime: string;
};

// Display version info
console.log(`Build: ${__GIT_INFO__.commitShort}`);
console.log(`Branch: ${__GIT_INFO__.branch}`);
console.log(`Built: ${new Date(__GIT_INFO__.buildTime).toLocaleString()}`);

// Show if there were uncommitted changes
if (__GIT_INFO__.isDirty) {
  console.warn("Built from dirty working tree");
}

// Display version from tags
if (__GIT_INFO__.lastTag) {
  const version = __GIT_INFO__.commitsSinceTag === 0
    ? __GIT_INFO__.lastTag
    : `${__GIT_INFO__.lastTag}+${__GIT_INFO__.commitsSinceTag}`;
  console.log(`Version: ${version}`);
}
```

### TypeScript Support

For better TypeScript support, you can use the provided types:

```ts
import type { BuildInfo } from "@mgcrea/vite-plugin-git-info";

declare global {
  const __GIT_INFO__: BuildInfo;
}
```

### Custom Global Name

```ts
import { gitInfo } from "@mgcrea/vite-plugin-git-info";

export default defineConfig({
  plugins: [
    gitInfo({
      globalName: "__BUILD_INFO__",
    }),
  ],
});
```

### Debug Mode

Enable debug logging to troubleshoot:

```ts
gitInfo({
  debug: true, // Logs git info retrieval process
});
```

### Docker / CI Builds

The plugin automatically checks for environment variables when git commands aren't available (e.g., in Docker builds without .git directory):

```dockerfile
# Dockerfile
ARG GIT_COMMIT
ARG GIT_COMMIT_SHORT
ARG GIT_COMMIT_TIME
ARG GIT_BRANCH
ARG GIT_IS_DIRTY
ARG GIT_LAST_TAG
ARG GIT_COMMITS_SINCE_TAG

ENV GIT_COMMIT=$GIT_COMMIT
ENV GIT_COMMIT_SHORT=$GIT_COMMIT_SHORT
ENV GIT_COMMIT_TIME=$GIT_COMMIT_TIME
ENV GIT_BRANCH=$GIT_BRANCH
ENV GIT_IS_DIRTY=$GIT_IS_DIRTY
ENV GIT_LAST_TAG=$GIT_LAST_TAG
ENV GIT_COMMITS_SINCE_TAG=$GIT_COMMITS_SINCE_TAG
```

Build with:

```bash
docker build \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  --build-arg GIT_COMMIT_SHORT=$(git rev-parse --short HEAD) \
  --build-arg GIT_COMMIT_TIME=$(git log -1 --format=%ct) \
  --build-arg GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD) \
  --build-arg GIT_IS_DIRTY=$(git status --porcelain | wc -l | xargs test 0 -ne && echo "true" || echo "false") \
  --build-arg GIT_LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "") \
  --build-arg GIT_COMMITS_SINCE_TAG=$(git rev-list --count $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD)..HEAD 2>/dev/null || echo "0") \
  .
```

### Custom Environment Variables

```ts
gitInfo({
  envPrefix: "CI_",
  envVars: {
    commitHash: "COMMIT_SHA",
    commitShort: "COMMIT_SHORT_SHA",
    branch: "COMMIT_BRANCH",
    isDirty: "WORKSPACE_DIRTY",
    lastTag: "TAG_NAME",
    commitsSinceTag: "TAG_DISTANCE",
  },
});
```

### Manual Usage (without define)

If you want to use the git info in your Vite config without defining a global:

```ts
import { getGitInfo } from "@mgcrea/vite-plugin-git-info";

const git = getGitInfo();

console.log(`Building ${git.commitShort} on ${git.branch}`);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify({
      version: process.env.npm_package_version,
      commit: git.commitShort,
      buildTime: new Date().toISOString(),
    }),
  },
  plugins: [
    gitInfo({ define: false }), // Don't auto-inject
  ],
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `globalName` | `string` | `"__GIT_INFO__"` | The global variable name (must be valid JS identifier) |
| `envPrefix` | `string \| false` | `"GIT_"` | Environment variable prefix, or `false` to disable |
| `envVars` | `object` | See below | Custom environment variable names |
| `define` | `boolean` | `true` | Whether to add to Vite's define config |
| `timeout` | `number` | `5000` | Timeout for git commands in milliseconds |
| `debug` | `boolean` | `false` | Enable debug logging |

### Default Environment Variables

| Property | Default Env Var | Description |
| -------- | --------------- | ----------- |
| `commitHash` | `GIT_COMMIT` | Full commit SHA hash |
| `commitShort` | `GIT_COMMIT_SHORT` | Short commit SHA (7 chars) |
| `commitTime` | `GIT_COMMIT_TIME` | Unix timestamp of commit |
| `branch` | `GIT_BRANCH` | Current branch name |
| `isDirty` | `GIT_IS_DIRTY` | "true" or "1" if working tree is dirty |
| `lastTag` | `GIT_LAST_TAG` | Most recent tag name |
| `commitsSinceTag` | `GIT_COMMITS_SINCE_TAG` | Number of commits since last tag |

## Types

### BuildInfo

The complete build information injected by the plugin:

```ts
interface BuildInfo {
  commitHash: string;      // Full commit SHA
  commitShort: string;     // Short commit SHA (7 chars)
  commitTime: string;      // Unix timestamp of commit
  branch: string;          // Current branch name
  isDirty: boolean;        // Whether working tree has uncommitted changes
  lastTag: string;         // Most recent tag (empty if none)
  commitsSinceTag: number; // Commits since last tag (or total if no tag)
  buildTime: string;       // ISO 8601 timestamp when build was created
}
```

### GitInfo

Raw git information without build metadata:

```ts
interface GitInfo {
  commitHash: string;
  commitShort: string;
  commitTime: string;
  branch: string;
  isDirty: boolean;
  lastTag: string;
  commitsSinceTag: number;
}
```

## Examples

### Display Version in Footer

```tsx
// Footer.tsx
export function Footer() {
  const version = __GIT_INFO__.lastTag || __GIT_INFO__.commitShort;
  const isDev = __GIT_INFO__.isDirty;

  return (
    <footer>
      <p>
        Version: {version}
        {isDev && <span className="badge">DEV</span>}
      </p>
      <p>Built: {new Date(__GIT_INFO__.buildTime).toLocaleString()}</p>
    </footer>
  );
}
```

### Semantic Version from Git Tags

```ts
function getSemanticVersion(): string {
  const { lastTag, commitsSinceTag, commitShort, isDirty } = __GIT_INFO__;

  if (!lastTag) {
    return `0.0.0-dev.${commitShort}`;
  }

  if (commitsSinceTag === 0) {
    return isDirty ? `${lastTag}-dirty` : lastTag;
  }

  return `${lastTag}+${commitsSinceTag}.${commitShort}${isDirty ? "-dirty" : ""}`;
}

console.log(getSemanticVersion()); // e.g., "v1.2.3+5.abc1234-dirty"
```

### Environment Detection

```ts
const isProduction = !__GIT_INFO__.isDirty && __GIT_INFO__.branch === "main";
const isStaging = __GIT_INFO__.branch === "staging";
const isDevelopment = __GIT_INFO__.isDirty || __GIT_INFO__.branch === "develop";
```

## How It Works

1. **Git Commands**: The plugin runs git commands at build time to gather repository information
2. **Environment Fallback**: If git commands fail (e.g., in Docker), it checks environment variables
3. **Build Injection**: Information is injected into your bundle via Vite's `define` feature
4. **No Runtime Overhead**: All data is computed at build time and embedded as constants

## License

MIT

## Contributing

Issues and pull requests are welcome!
