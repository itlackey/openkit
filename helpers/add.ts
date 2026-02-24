import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { addPlugin } from "./config"
import { installExtensions } from "./install"

const EXTENSION_DIRS = ["agents", "commands", "plugins", "skills", "tools", "themes"]

/**
 * Add an openkit-compatible package to the current project.
 *
 * 1. Install the npm package.
 * 2. Copy its `opencode/` assets into `.opencode/`.
 * 3. Register the package in `opencode.json`.
 */
export async function add(packageName: string, dir: string): Promise<void> {
  console.log(`[openkit] adding ${packageName}...`)

  // 1. Install the npm package
  console.log(`[openkit] installing ${packageName}...`)
  try {
    execSync(`npm install ${packageName}`, { cwd: dir, stdio: "inherit" })
  } catch {
    throw new Error(`Failed to install ${packageName}. Is it a valid npm package?`)
  }

  // 2. Resolve the installed package's root directory
  const packageRoot = resolvePackageRoot(packageName, dir)
  const sourceDir = path.join(packageRoot, "opencode")

  // 3. Copy assets if the package has an opencode/ directory
  if (fs.existsSync(sourceDir)) {
    const { copied } = await installExtensions({
      name: packageName,
      targetDir: dir,
      sourceUrl: `file://${path.join(packageRoot, "helpers", "_marker.js")}`,
      dirs: EXTENSION_DIRS,
    })
    console.log(`[openkit] copied ${copied.length} extension file(s)`)
  } else {
    console.log(`[openkit] no opencode/ directory found in ${packageName} (plugin-only package)`)
  }

  // 4. Register in opencode.json
  const changed = addPlugin(dir, packageName)
  if (changed) {
    console.log(`[openkit] added "${packageName}" to opencode.json plugins`)
  } else {
    console.log(`[openkit] "${packageName}" was already in opencode.json plugins`)
  }

  console.log(`[openkit] done!`)
}

/**
 * Resolve the root directory of an installed npm package.
 */
function resolvePackageRoot(packageName: string, dir: string): string {
  // Try to find the package's package.json via require.resolve
  const nodeModulesDir = path.join(dir, "node_modules", ...packageName.split("/"))
  if (fs.existsSync(path.join(nodeModulesDir, "package.json"))) {
    return nodeModulesDir
  }
  throw new Error(
    `Could not find installed package "${packageName}" in ${path.join(dir, "node_modules")}`,
  )
}
