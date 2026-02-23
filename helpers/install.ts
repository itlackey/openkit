import type { Plugin } from "@opencode-ai/plugin"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

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
 */
export function createInstallerPlugin(options: InstallerOptions): Plugin {
  return async (input) => {
    const { created } = await installExtensions({ ...options, targetDir: input.directory })
    if (created.length > 0) {
      console.log(
        `[${options.name}] new extensions installed — restart OpenCode to pick them up`,
      )
    }
    return {}
  }
}

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
