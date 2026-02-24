import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { tool } from "@opencode-ai/plugin"

const execFileAsync = promisify(execFile)

export default tool({
  description:
    "Remove an openkit package, clean installed extension files, and unregister it from opencode.json.",
  args: {
    packageName: tool.schema
      .string()
      .describe("npm package name to remove, for example: '@example/opencode-helpers'"),
  },
  async execute({ packageName }) {
    const trimmed = packageName.trim()
    if (!trimmed) {
      return JSON.stringify({
        ok: false,
        error: "missing_package_name",
      })
    }

    const args = ["@itlackey/openkit", "remove", trimmed]

    try {
      const { stdout, stderr } = await execFileAsync("npx", args, {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024,
      })

      return JSON.stringify({
        ok: true,
        command: `npx ${args.join(" ")}`,
        packageName: trimmed,
        output: [stdout.trim(), stderr.trim()].filter(Boolean).join("\n"),
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return JSON.stringify({
        ok: false,
        command: `npx ${args.join(" ")}`,
        packageName: trimmed,
        error: `openkit_remove_failed: ${message}`,
      })
    }
  },
})
