import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { removePlugin } from "./config"

const EXTENSION_DIRS = ["agents", "commands", "plugins", "skills", "tools", "themes"]

/**
 * Remove an openkit-compatible package from the current project.
 *
 * 1. Identify assets that came from this package.
 * 2. Remove those files from `.opencode/`.
 * 3. Unregister the package from `opencode.json`.
 * 4. Uninstall the npm package.
 */
export async function remove(packageName: string, dir: string): Promise<void> {
  console.log(`[openkit] removing ${packageName}...`)

  // 1. Resolve the package root to identify which assets to remove
  const nodeModulesDir = path.join(dir, "node_modules", ...packageName.split("/"))
  const sourceDir = path.join(nodeModulesDir, "opencode")

  if (fs.existsSync(sourceDir)) {
    const removed = removeAssets(sourceDir, path.join(dir, ".opencode"))
    console.log(`[openkit] removed ${removed} extension file(s) from .opencode/`)
  } else {
    console.log(`[openkit] no opencode/ directory found in ${packageName} (plugin-only package)`)
  }

  // 2. Unregister from opencode.json
  const changed = removePlugin(dir, packageName)
  if (changed) {
    console.log(`[openkit] removed "${packageName}" from opencode.json plugins`)
  } else {
    console.log(`[openkit] "${packageName}" was not in opencode.json plugins`)
  }

  // 3. Uninstall the npm package
  console.log(`[openkit] uninstalling ${packageName}...`)
  try {
    execSync(`npm uninstall ${packageName}`, { cwd: dir, stdio: "inherit" })
  } catch {
    console.warn(`[openkit] warning: npm uninstall failed for ${packageName}`)
  }

  console.log(`[openkit] done!`)
}

/**
 * Remove extension files from `.opencode/` that match the source package's
 * `opencode/` directory structure. Only removes files that exist in both the
 * source and target — user-created files are never touched.
 *
 * After removing files, cleans up empty directories.
 */
function removeAssets(sourceDir: string, targetBase: string): number {
  let count = 0
  for (const dir of EXTENSION_DIRS) {
    const src = path.join(sourceDir, dir)
    const dest = path.join(targetBase, dir)
    if (!fs.existsSync(src) || !fs.existsSync(dest)) continue
    count += removeMatchingFiles(src, dest)
  }
  return count
}

/**
 * Recursively remove files from `dest` that exist in `src` (by relative path).
 * Cleans up empty directories afterwards.
 */
function removeMatchingFiles(src: string, dest: string): number {
  let count = 0
  if (!fs.existsSync(src) || !fs.existsSync(dest)) return count

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      count += removeMatchingFiles(srcPath, destPath)
    } else if (entry.isFile() && fs.existsSync(destPath)) {
      fs.unlinkSync(destPath)
      count++
    }
  }

  // Clean up empty directories
  if (fs.existsSync(dest)) {
    const remaining = fs.readdirSync(dest)
    if (remaining.length === 0) {
      fs.rmSync(dest, { recursive: true })
    }
  }

  return count
}
