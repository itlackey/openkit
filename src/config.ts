import fs from "node:fs"
import path from "node:path"

const CONFIG_FILE = "opencode.json"

export interface OpenCodeConfig {
  $schema?: string
  plugin?: string[]
  [key: string]: unknown
}

/**
 * Resolve the full path to the project's `opencode.json`.
 */
export function configPath(dir: string): string {
  return path.join(dir, CONFIG_FILE)
}

/**
 * Read the project's `opencode.json`, returning an empty config object if the
 * file does not exist or cannot be parsed.
 */
export function readConfig(dir: string): OpenCodeConfig {
  const file = configPath(dir)
  if (!fs.existsSync(file)) return {}
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as OpenCodeConfig
  } catch {
    return {}
  }
}

/**
 * Write an `opencode.json` config back to disk, preserving existing formatting
 * (2-space indent).
 */
export function writeConfig(dir: string, config: OpenCodeConfig): void {
  fs.writeFileSync(configPath(dir), JSON.stringify(config, null, 2) + "\n")
}

/**
 * Add a plugin to the project's `opencode.json` if it isn't already listed.
 * Creates the config file when it doesn't exist.
 *
 * Returns `true` if the config was changed.
 */
export function addPlugin(dir: string, packageName: string): boolean {
  const config = readConfig(dir)
  const plugins = config.plugin ?? []
  if (plugins.includes(packageName)) return false
  config.plugin = [...plugins, packageName]
  if (!config.$schema) {
    // Ensure $schema is first when creating a new config
    const ordered: OpenCodeConfig = { $schema: "https://opencode.ai/config.json", ...config }
    writeConfig(dir, ordered)
  } else {
    writeConfig(dir, config)
  }
  return true
}

/**
 * Remove a plugin from the project's `opencode.json`.
 *
 * Returns `true` if the config was changed.
 */
export function removePlugin(dir: string, packageName: string): boolean {
  const config = readConfig(dir)
  const plugins = config.plugin ?? []
  const idx = plugins.indexOf(packageName)
  if (idx === -1) return false
  plugins.splice(idx, 1)
  config.plugin = plugins
  writeConfig(dir, config)
  return true
}
