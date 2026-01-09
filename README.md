# vite-plugin-git-info

A Vite plugin that exposes git information (commit hash, branch, timestamp) as a global variable in your application.

## Installation

```bash
npm install vite-plugin-git-info --save-dev
# or
pnpm add -D vite-plugin-git-info
```

## Usage

### Basic Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { gitInfo } from "vite-plugin-git-info";

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
};

console.log(`Version: ${__GIT_INFO__.commitShort}`);
console.log(`Branch: ${__GIT_INFO__.branch}`);
```

### Custom Global Name

```ts
import { gitInfo } from "vite-plugin-git-info";

export default defineConfig({
  plugins: [
    gitInfo({
      globalName: "__BUILD_INFO__",
    }),
  ],
});
```

### Docker / CI Builds

The plugin automatically checks for environment variables when git commands aren't available (e.g., in Docker builds without .git directory):

```dockerfile
ARG GIT_COMMIT
ARG GIT_COMMIT_SHORT
ARG GIT_COMMIT_TIME
ARG GIT_BRANCH

ENV GIT_COMMIT=$GIT_COMMIT
ENV GIT_COMMIT_SHORT=$GIT_COMMIT_SHORT
ENV GIT_COMMIT_TIME=$GIT_COMMIT_TIME
ENV GIT_BRANCH=$GIT_BRANCH
```

### Custom Environment Variables

```ts
gitInfo({
  envPrefix: "CI_",
  envVars: {
    commitHash: "COMMIT_SHA",
    commitShort: "COMMIT_SHORT_SHA",
    branch: "COMMIT_BRANCH",
  },
});
```

### Manual Usage (without define)

If you want to use the git info in your Vite config without defining a global:

```ts
import { getGitInfo } from "vite-plugin-git-info";

const git = getGitInfo();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify({
      version: process.env.npm_package_version,
      commit: git.commitShort,
      buildTime: Date.now(),
    }),
  },
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `globalName` | `string` | `"__GIT_INFO__"` | The global variable name to use |
| `envPrefix` | `string \| false` | `"GIT_"` | Environment variable prefix, or `false` to disable |
| `envVars` | `object` | See below | Custom environment variable names |
| `define` | `boolean` | `true` | Whether to add to Vite's define config |

### Default Environment Variables

| Property | Default Env Var |
|----------|-----------------|
| `commitHash` | `GIT_COMMIT` |
| `commitShort` | `GIT_COMMIT_SHORT` |
| `commitTime` | `GIT_COMMIT_TIME` |
| `branch` | `GIT_BRANCH` |

## GitInfo Type

```ts
interface GitInfo {
  commitHash: string;   // Full commit SHA
  commitShort: string;  // Short commit SHA (7 chars)
  commitTime: string;   // Unix timestamp of commit
  branch: string;       // Current branch name
}
```

## License

MIT
