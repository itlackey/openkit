# OpenKit

Ship production-ready [OpenCode](https://opencode.ai) extensions as one npm package.

OpenKit gives you a clean packaging pattern for agents, commands, plugins, skills, tools, and themes. Add files to `opencode/`, publish once, and your users install with a single plugin entry.

OpenKit is built for teams publishing **OpenCode plugins** and **OpenCode extension packs** to npm.

## Why developers use OpenKit

- **One package, full extension surface**: ship commands, agents, skills, tools, plugins, and themes together.
- **Safe installs by default**: existing user files are preserved (`overwrite: false`).
- **Works with real plugin code**: use standalone installer mode or compose it into your own plugin.
- **Low maintenance**: no custom copy scripts or postinstall hacks.
- **CLI included**: add, remove, and search for openkit packages directly from the command line.

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

### 1) Create from template

Click **Use this template** on GitHub, then update `name` in `package.json`.

### 2) Add extensions

Drop files into the matching subdirectory:
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

In `src/plugin.ts`:
```typescript
import { createInstallerPlugin } from "../helpers/install"
export const plugin = createInstallerPlugin({
  name: "my-opencode-extension",
})
```

`sourceUrl` is optional in a template repo. Pass `sourceUrl: import.meta.url` when using `@itlackey/openkit/install` from an external dependency.

### 4) Install in a project

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["my-opencode-extension"]
}
```

When OpenCode starts, the installer copies your `opencode/` files into the project's `.opencode/` directory. Existing files are never overwritten by default, so user customizations stay intact.

## Included examples

| Extension | Type | Try it |
|---|---|---|
| `/hello` | Command | Slash command |
| `@review` | Agent | Read-only code review subagent |
| `hello-skill` | Skill | Prompt template |
| `hello` | Tool | File-based custom tool |
| `greet` | Tool | Plugin-registered tool |
| `template-dark` | Theme | Dark color theme |

## Use as a dependency

Don't want to clone the template? Install from GitHub and import the helper from `@itlackey/openkit`.

```bash
bun add itlackey/openkit
```

If you also register tools directly in your plugin, add `@opencode-ai/plugin` too.

### Standalone installer

Use this when your package only ships file-based extensions:

```typescript
import { createInstallerPlugin } from "@itlackey/openkit/install"
export const plugin = createInstallerPlugin({
  name: "my-opencode-extension",
  sourceUrl: import.meta.url, // required when used as a dependency
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
  "files": ["dist", "opencode", "helpers"],
  "dependencies": {
    "@opencode-ai/plugin": "^1.2.10"
  }
}
```

When using `@itlackey/openkit/install` instead of local helpers:

```json
{
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
| `sourceUrl` | no | — | Pass `import.meta.url` when used as a dependency |

## Publish checklist

Before running `npm publish`:

- Use a clear package name (`my-opencode-extension`) and concise description.
- Add searchable keywords like `opencode`, `opencode-plugin`, `opencode-extension`.
- Confirm `main`/`exports` point to compiled JS in `dist/` and `types` points to declarations.
- Ensure `files` includes everything users need (`dist`, `opencode`, and any helper dir you import).
- Test installation with a real `opencode.json` plugin entry in a sample project.

## Docs

- [Plugins](https://opencode.ai/docs/plugins/)
- [Commands](https://opencode.ai/docs/commands/)
- [Agents](https://opencode.ai/docs/agents/)
- [Agent Skills](https://opencode.ai/docs/skills/)
- [Custom tools](https://opencode.ai/docs/custom-tools/)
- [Themes](https://opencode.ai/docs/themes/)
- [Config](https://opencode.ai/docs/config/)
