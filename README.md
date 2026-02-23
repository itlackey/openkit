# OpenKit

A GitHub template for packaging **all OpenCode extension types** into a single npm package. Drop files into `opencode/` and the installer plugin handles the rest.

## Extension types

| Type | Source directory | Description |
|---|---|---|
| Agents | `opencode/agents/` | Markdown agent definitions |
| Commands | `opencode/commands/` | Markdown slash commands |
| Plugins | `opencode/plugins/` | File-based plugins (TypeScript, full Plugin API) |
| Skills | `opencode/skills/<name>/SKILL.md` | Discoverable prompt templates |
| Tools | `opencode/tools/` | Custom tools (TypeScript) |
| Themes | `opencode/themes/` | JSON color themes |

## How it works

The only required TypeScript in this package is a thin installer plugin built with `createInstallerPlugin()`. When OpenCode loads it, it copies everything from the package's `opencode/` directory into the project's `.opencode/` directory. After that, OpenCode's native file-based discovery picks up all the extensions — including any file-based plugins, tools, agents, commands, skills, and themes.

Files that already exist in `.opencode/` are skipped so user customizations are preserved.

## Quick start

### 1) Use as a template

Click **Use this template** on GitHub, then update the `name` in `package.json`.

### 2) Add your extensions

Drop files into the appropriate `opencode/` subdirectory:

```
opencode/
├── agents/       # .md files
├── commands/     # .md files
├── plugins/      # .ts files (full Plugin API)
├── skills/       # <name>/SKILL.md
├── tools/        # .ts files
└── themes/       # .json files
```

### 3) Update the plugin name

In `src/plugin.ts`, change the name to match your package:

```typescript
import { createInstallerPlugin } from "../helpers/install"

export const plugin = createInstallerPlugin({
  name: "my-extension",
})
```

That's it. Everything else is just files in `opencode/`.

### 4) Enable in a project

Add to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["your-package-name"]
}
```

### 5) Try the included examples

- `/hello` — example command
- `@review` — example agent (read-only code review subagent)
- `hello-skill` — example skill
- `hello` tool — example file-based custom tool
- `greet` tool — example tool registered by a file-based plugin
- `template-dark` — example theme

## Using as a dependency

Instead of cloning the template, you can add `openkit` as a dependency and import `createInstallerPlugin` into your own project. This is useful when you want to build an extension package from scratch or integrate the installer into an existing project.

### 1) Create your package

```bash
mkdir my-opencode-extension && cd my-opencode-extension
bun init
bun add openkit @opencode-ai/plugin
```

### 2) Set up your repo layout

```
my-opencode-extension/
├── src/
│   └── plugin.ts            # Installer plugin (see below)
├── opencode/                # Your extension files
│   ├── agents/
│   │   └── my-agent.md
│   ├── commands/
│   │   └── my-command.md
│   ├── plugins/
│   │   └── my-plugin.ts
│   ├── skills/
│   │   └── my-skill/
│   │       └── SKILL.md
│   ├── tools/
│   │   └── my-tool.ts
│   └── themes/
│       └── my-theme.json
├── package.json
└── tsconfig.json
```

You only need the subdirectories for extension types you're using — empty directories can be omitted.

### 3) Create the installer plugin

**New plugin** — if your package only needs to install file-based extensions, the installer plugin is all you need. Pass `sourceUrl` so the helper can locate your package's `opencode/` directory (required when importing from a dependency, since `import.meta.url` inside the helper would otherwise resolve to the dependency's location, not yours):

```typescript
import { createInstallerPlugin } from "openkit/install"

export const plugin = createInstallerPlugin({
  name: "my-opencode-extension",
  sourceUrl: import.meta.url,
})
```

**Existing plugin** — if you already have a plugin that registers hooks, tools, or auth, you can add the installer alongside your existing logic. Import `installExtensions` from `openkit/install` and call it at the start of your plugin function:

```typescript
import { type Plugin, tool } from "@opencode-ai/plugin"
import { installExtensions } from "openkit/install"

export const plugin: Plugin = async (input) => {
  // Install file-based extensions from this package's opencode/ directory
  await installExtensions({
    sourceUrl: import.meta.url,
    targetDir: input.directory,
    name: "my-opencode-extension",
  })

  // Your existing plugin logic
  return {
    tool: {
      "my-tool": tool({
        description: "My custom tool",
        args: { query: tool.schema.string().describe("Search query") },
        async execute({ query }) {
          return `Result for: ${query}`
        },
      }),
    },
    event: async ({ event }) => {
      // handle events
    },
  }
}
```

### 4) Configure package.json

```json
{
  "name": "my-opencode-extension",
  "type": "module",
  "exports": {
    ".": "./src/plugin.ts"
  },
  "files": ["src", "opencode"],
  "dependencies": {
    "openkit": "^0.1.0",
    "@opencode-ai/plugin": "^1.2.10"
  }
}
```

The key fields:
- **`exports`** — points directly to your TypeScript plugin so OpenCode can load it
- **`files`** — includes `opencode/` so your extension files are published with the package

### 5) Test it

Add your package to a project's `opencode.json`:

```json
{
  "plugin": ["my-opencode-extension"]
}
```

When OpenCode starts, it installs your package, runs the installer plugin, and copies your extension files into `.opencode/`.

### Options

| Option | Required | Default | Description |
|---|---|---|---|
| `name` | yes | — | Label for log messages. |
| `dirs` | no | all 6 types | Which subdirectories to install. |
| `overwrite` | no | `false` | Overwrite existing files. |
| `sourceUrl` | no | — | Required when importing as a dependency. Pass `import.meta.url`. |


## References

- [Plugins](https://opencode.ai/docs/plugins/)
- [Commands](https://opencode.ai/docs/commands/)
- [Agents](https://opencode.ai/docs/agents/)
- [Skills](https://opencode.ai/docs/skills/)
- [Custom tools](https://opencode.ai/docs/custom-tools/)
- [Themes](https://opencode.ai/docs/themes/)
- [Config](https://opencode.ai/docs/config/)

## License

[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
