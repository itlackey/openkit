import type { Hooks, Plugin, PluginInput, ToolDefinition } from "@opencode-ai/plugin"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const DEFAULT_DIRS = ["agents", "commands", "plugins", "skills", "tools", "themes"]

export interface InstallerOptions {
  /** Name used in log messages. */
  name: string
  /** Which extension directories to install. @default all 6 types */
  dirs?: string[]
  /** Overwrite existing files. @default false */
  overwrite?: boolean
  /**
   * Module URL used to locate the package root. Only needed when importing
   * from a dependency — pass `import.meta.url` from your plugin module.
   * Not needed when using this as a template.
   */
  sourceUrl?: string
}

/**
 * Install file-based extensions from the package's `opencode/` directory
 * into the project's `.opencode/` directory.
 *
 * Use this inside an existing plugin that has its own hooks/tools.
 */
export async function installExtensions(
  options: InstallerOptions & { targetDir: string },
): Promise<{ copied: string[]; skipped: string[]; created: string[] }> {
  const { name, targetDir, dirs = DEFAULT_DIRS, overwrite = false, sourceUrl } = options

  const resolvedUrl = sourceUrl ?? import.meta.url
  const packageRoot = path.resolve(path.dirname(fileURLToPath(resolvedUrl)), "..")
  const source = path.join(packageRoot, "opencode")
  const target = path.join(targetDir, ".opencode")

  const copied: string[] = []
  const skipped: string[] = []
  const created: string[] = []

  if (!fs.existsSync(source)) return { copied, skipped, created }

  for (const dir of dirs) {
    const src = path.join(source, dir)
    if (!fs.existsSync(src)) continue
    copyDir(src, path.join(target, dir), { overwrite, copied, skipped, created })
  }

  if (copied.length > 0) {
    console.log(`[${name}] installed ${copied.length} extension file(s) into ${target}`)
  }

  return { copied, skipped, created }
}

/**
 * Create an OpenCode plugin that installs file-based extensions on load.
 *
 * Use this when the installer is all your plugin needs.
 *
 * On first install (when new files are created), extensions are registered
 * programmatically so they are available immediately without a restart.
 * On subsequent sessions OpenCode loads them from `.opencode/` as normal.
 */
export function createInstallerPlugin(options: InstallerOptions): Plugin {
  return async (input) => {
    const { created } = await installExtensions({ ...options, targetDir: input.directory })

    if (created.length === 0) {
      return {}
    }

    const resolvedUrl = options.sourceUrl ?? import.meta.url
    const packageRoot = path.resolve(path.dirname(fileURLToPath(resolvedUrl)), "..")
    const sourceDir = path.join(packageRoot, "opencode")
    const dirs = new Set(options.dirs ?? DEFAULT_DIRS)

    console.log(`[${options.name}] registering ${created.length} new extension(s) for current session`)

    let hooks: Hooks = {}

    // Agents and commands are loaded by OpenCode's Config before plugins run,
    // so newly copied files won't be picked up until the next session.
    // Register them programmatically via the config hook for immediate use.
    const agents = dirs.has("agents") ? loadAgents(sourceDir, options.name) : {}
    const commands = dirs.has("commands") ? loadCommands(sourceDir, options.name) : {}

    if (Object.keys(agents).length > 0 || Object.keys(commands).length > 0) {
      hooks.config = async (config: Record<string, any>) => {
        if (Object.keys(agents).length > 0) {
          config.agent = { ...config.agent, ...agents }
        }
        if (Object.keys(commands).length > 0) {
          config.command = { ...config.command, ...commands }
        }
      }
    }

    // File-based plugins in .opencode/plugins/ are also discovered before our
    // npm plugin runs. Import and execute them now, merging their hooks.
    if (dirs.has("plugins")) {
      const pluginHooks = await loadPlugins(sourceDir, input, options.name)
      for (const ph of pluginHooks) {
        hooks = mergeHooks(hooks, ph)
      }
    }

    // Tools, skills, and themes are loaded lazily by OpenCode after plugins
    // initialise, so the copied files will be discovered automatically.

    return hooks
  }
}

// ---------------------------------------------------------------------------
// Markdown frontmatter parser (handles simple YAML key: value pairs)
// ---------------------------------------------------------------------------

function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, content: raw }

  const data: Record<string, unknown> = {}
  let currentKey: string | null = null
  let nested: Record<string, unknown> | null = null

  for (const line of match[1].split(/\r?\n/)) {
    const indented = line.match(/^  (\w[\w-]*):\s*(.+)$/)
    if (indented && currentKey && nested) {
      nested[indented[1]] = parseValue(indented[2])
      continue
    }

    const top = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (!top) continue

    currentKey = top[1]
    const value = top[2].trim()

    if (value === "") {
      nested = {}
      data[currentKey] = nested
    } else {
      nested = null
      data[currentKey] = parseValue(value)
    }
  }

  return { data, content: match[2] }
}

function parseValue(s: string): string | number | boolean {
  if (s === "true") return true
  if (s === "false") return false
  const n = Number(s)
  if (!Number.isNaN(n) && s.trim() !== "") return n
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
    return s.slice(1, -1)
  return s
}

// ---------------------------------------------------------------------------
// Source loaders – read extension files from the package's opencode/ directory
// ---------------------------------------------------------------------------

function loadAgents(sourceDir: string, pluginName: string): Record<string, unknown> {
  const dir = path.join(sourceDir, "agents")
  if (!fs.existsSync(dir)) return {}

  const result: Record<string, unknown> = {}
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue
    try {
      const raw = fs.readFileSync(path.join(dir, entry.name), "utf8")
      const { data, content } = parseFrontmatter(raw)
      const name = path.basename(entry.name, ".md")
      result[name] = { ...data, prompt: content.trim() }
    } catch (err) {
      console.warn(`[${pluginName}] failed to parse agent ${entry.name}`, err)
    }
  }
  return result
}

function loadCommands(sourceDir: string, pluginName: string): Record<string, unknown> {
  const dir = path.join(sourceDir, "commands")
  if (!fs.existsSync(dir)) return {}

  const result: Record<string, unknown> = {}
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue
    try {
      const raw = fs.readFileSync(path.join(dir, entry.name), "utf8")
      const { data, content } = parseFrontmatter(raw)
      const name = path.basename(entry.name, ".md")
      result[name] = { ...data, template: content.trim() }
    } catch (err) {
      console.warn(`[${pluginName}] failed to parse command ${entry.name}`, err)
    }
  }
  return result
}

async function loadPlugins(
  sourceDir: string,
  input: PluginInput,
  pluginName: string,
): Promise<Hooks[]> {
  const dir = path.join(sourceDir, "plugins")
  if (!fs.existsSync(dir)) return []

  const hooksList: Hooks[] = []
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".ts") && !entry.endsWith(".js")) continue
    try {
      const mod = await import(pathToFileURL(path.join(dir, entry)).href)
      const seen = new Set<Function>()
      for (const fn of Object.values(mod)) {
        if (typeof fn !== "function" || seen.has(fn)) continue
        seen.add(fn)
        const result = await (fn as Plugin)(input)
        if (result) hooksList.push(result)
      }
    } catch (err) {
      console.warn(`[${pluginName}] failed to load plugin ${entry}`, err)
    }
  }
  return hooksList
}

// ---------------------------------------------------------------------------
// Hook merging – combine hooks from multiple sources into a single Hooks object
// ---------------------------------------------------------------------------

function mergeHooks(base: Hooks, other: Hooks): Hooks {
  const merged: Hooks = { ...base }

  if (other.tool) {
    merged.tool = { ...merged.tool, ...other.tool }
  }

  if (other.event) {
    const prev = merged.event
    const next = other.event
    merged.event = prev
      ? async (input) => { await prev(input); await next(input) }
      : next
  }

  if (other.config) {
    const prev = merged.config
    const next = other.config
    merged.config = prev
      ? async (input) => { await prev(input); await next(input) }
      : next
  }

  const hookNames = [
    "chat.message", "chat.params", "chat.headers",
    "permission.ask", "command.execute.before",
    "tool.execute.before", "tool.execute.after", "tool.definition",
    "shell.env",
    "experimental.chat.messages.transform",
    "experimental.chat.system.transform",
    "experimental.session.compacting",
    "experimental.text.complete",
  ] as const

  for (const name of hookNames) {
    if (!other[name]) continue
    const prev = merged[name] as ((...args: any[]) => Promise<void>) | undefined
    const next = other[name] as (...args: any[]) => Promise<void>
    ;(merged as any)[name] = prev
      ? async (...args: any[]) => { await prev(...args); await next(...args) }
      : next
  }

  return merged
}

// ---------------------------------------------------------------------------

function copyDir(
  src: string,
  dest: string,
  ctx: { overwrite: boolean; copied: string[]; skipped: string[]; created: string[] },
) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(s, d, ctx)
    } else if (entry.isFile()) {
      const exists = fs.existsSync(d)
      if (!ctx.overwrite && exists) {
        ctx.skipped.push(d)
      } else {
        fs.mkdirSync(path.dirname(d), { recursive: true })
        fs.copyFileSync(s, d)
        ctx.copied.push(d)
        if (!exists) ctx.created.push(d)
      }
    }
  }
}
