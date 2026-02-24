# OpenKit

Ship production-ready [OpenCode](https://opencode.ai) extensions as one npm package.

OpenKit gives you a CLI and installer library for packaging and distributing agents, commands, plugins, skills, tools, and themes. Add files to `opencode/`, publish once, and your users install with a single command or plugin entry.

## Why developers use OpenKit

- **CLI for discovery and management**: search, add, and remove openkit packages from the command line.
- **One package, full extension surface**: ship commands, agents, skills, tools, plugins, and themes together.
- **Safe installs by default**: existing user files are preserved (`overwrite: false`).
- **Works with real plugin code**: use standalone installer mode or compose it into your own plugin.
- **Low maintenance**: no custom copy scripts or postinstall hacks.

## CLI

OpenKit includes a CLI for managing openkit-compatible packages in your project.

### Search for packages

Find openkit-compatible packages on npm and GitHub:

```bash
npx @itlackey/openkit search [query]
```

Searches npm for packages with the `openkit` keyword and GitHub for repositories with the `openkit` topic.

### Add a package

Install a package and copy its extensions into your project:

```bash
npx @itlackey/openkit add <package>
```

This will:
1. Install the npm package.
2. Copy its `opencode/` assets into your project's `.opencode/` directory.
3. Register the package in `opencode.json`.

### Remove a package

Remove a package and clean up its extensions:

```bash
npx @itlackey/openkit remove <package>
```

This will:
1. Remove copied extension files from `.opencode/`.
2. Unregister the package from `opencode.json`.
3. Uninstall the npm package.

## Quick start

### 1) Install OpenKit

```bash
bun add @itlackey/openkit
```

If you also register tools directly in your plugin, add `@opencode-ai/plugin` too.

### 2) Add extensions

Drop files into the `opencode/` directory in your package:

```
opencode/
├── agents/       # .md    — agent definitions (primary or subagent)
├── commands/     # .md    — slash commands
├── plugins/      # .ts    — full Plugin API
├── skills/       # SKILL.md in named folders
├── tools/        # .ts    — custom tools
└── themes/       # .json  — color themes
```

### 3) Export the installer plugin

Create a plugin that uses the OpenKit installer to copy your extensions into the user's project:

```typescript
import { createInstallerPlugin } from "@itlackey/openkit/install"
export const plugin = createInstallerPlugin({
  name: "my-opencode-extension",
  sourceUrl: import.meta.url,
})
```

### 4) Register in a project

Add your package to the project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["my-opencode-extension"]
}
```

When OpenCode starts, the installer copies your `opencode/` files into the project's `.opencode/` directory. Existing files are never overwritten by default, so user customizations stay intact.

## Installer usage

### Standalone installer

Use this when your package only ships file-based extensions (agents, commands, skills, tools, themes):

```typescript
import { createInstallerPlugin } from "@itlackey/openkit/install"
export const plugin = createInstallerPlugin({
  name: "my-opencode-extension",
  sourceUrl: import.meta.url,
})
```

### Compose with an existing plugin

Mix the installer with your own tools and hooks:

```typescript
import { type Plugin, tool } from "@opencode-ai/plugin"
import { installExtensions } from "@itlackey/openkit/install"
export const plugin: Plugin = async (input) => {
  await installExtensions({
    sourceUrl: import.meta.url,
    targetDir: input.directory,
    name: "my-opencode-extension",
  })
  return {
    tool: {
      "my-tool": tool({
        description: "Example tool",
        args: {
          message: tool.schema.string().describe("Message to echo"),
        },
        async execute({ message }) {
          return `my-tool: ${message}`
        },
      }),
    },
  }
}
```

### package.json essentials

```json
{
  "name": "my-opencode-extension",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "opencode"],
  "dependencies": {
    "@itlackey/openkit": "^0.1.0"
  }
}
```

## Installer options

| Option | Required | Default | Description |
|---|---|---|---|
| `name` | yes | — | Label for log messages |
| `dirs` | no | all 6 types | Limit which subdirectories to install |
| `overwrite` | no | `false` | Overwrite existing files |
| `sourceUrl` | yes | — | Pass `import.meta.url` to resolve the package's `opencode/` directory |

## Extension directory layout

Each extension type lives in a subdirectory under `opencode/`:

| Directory | File type | Description |
|---|---|---|
| `agents/` | `.md` | Agent definitions (primary or subagent) |
| `commands/` | `.md` | Slash commands |
| `plugins/` | `.ts` | Full Plugin API implementations |
| `skills/` | `SKILL.md` in named folders | Prompt templates |
| `tools/` | `.ts` | Custom tools |
| `themes/` | `.json` | Color themes |

## OpenKit agent + tools

This package includes OpenCode-ready plugin management helpers:

- `openkit-search` — search for OpenKit-compatible packages
- `openkit-add` — install and register a package in `opencode.json`
- `openkit-remove` — remove a package and clean copied extension files
- `openkit` skill — guidance for selecting the best plugin using OpenKit search + `curl`
- `@openkit-agent` — subagent for plugin discovery and lifecycle management

### Tool usage examples

From your assistant, call these tools directly:

- `openkit-search` with `query: "discord moderation"`
- `openkit-add` with `packageName: "@example/opencode-discord"`
- `openkit-remove` with `packageName: "@example/opencode-discord"`

### Agent usage

Use `@openkit-agent` when users ask to:

- Find the best plugin for a capability
- Install/add a plugin package
- Remove/uninstall a plugin package

The agent uses the OpenKit tools above and follows the `openkit` skill workflow for candidate evaluation and recommendations.

## Publish checklist

Before running `npm publish`:

- Use a clear package name (`my-opencode-extension`) and concise description.
- Add searchable keywords like `opencode`, `opencode-plugin`, `opencode-extension`, `openkit`.
- Confirm `main`/`exports` point to compiled JS in `dist/` and `types` points to declarations.
- Ensure `files` includes everything users need (`dist`, `opencode`).
- Test installation with a real `opencode.json` plugin entry in a sample project.

## Docs

- [Plugins](https://opencode.ai/docs/plugins/)
- [Commands](https://opencode.ai/docs/commands/)
- [Agents](https://opencode.ai/docs/agents/)
- [Agent Skills](https://opencode.ai/docs/skills/)
- [Custom tools](https://opencode.ai/docs/custom-tools/)
- [Themes](https://opencode.ai/docs/themes/)
- [Config](https://opencode.ai/docs/config/)
