import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { tool } from "@opencode-ai/plugin"

const execFileAsync = promisify(execFile)

type SearchItem = {
  name: string
  source?: "npm" | "github"
  description?: string
  version?: string
  url?: string
}

function parseSearchOutput(stdout: string): SearchItem[] {
  const lines = stdout.split("\n")
  const items: SearchItem[] = []
  let currentSource: "npm" | "github" | undefined
  let current: SearchItem | undefined

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (!line.trim()) continue

    if (line.toLowerCase().startsWith("npm packages")) {
      currentSource = "npm"
      current = undefined
      continue
    }
    if (line.toLowerCase().startsWith("github repositories")) {
      currentSource = "github"
      current = undefined
      continue
    }

    if (line.startsWith("  ") && !line.startsWith("    ")) {
      const text = line.trim()
      const match = text.match(/^(?<name>[^\s]+)(?: \((?<version>[^)]+)\))?$/)
      if (match?.groups?.name) {
        current = {
          name: match.groups.name,
          version: match.groups.version,
          source: currentSource,
        }
        items.push(current)
      }
      continue
    }

    if (line.startsWith("    ") && current) {
      const text = line.trim()
      if (text.startsWith("http://") || text.startsWith("https://")) {
        current.url = text
      } else {
        current.description = text
      }
    }
  }

  return items
}

export default tool({
  description:
    "Search for openkit-compatible plugins/packages using the OpenKit CLI (npm + GitHub).",
  args: {
    query: tool.schema.string().optional().describe("Optional search query (for example: 'discord moderation')"),
  },
  async execute({ query }) {
    const args = ["@itlackey/openkit", "search"]
    if (query && query.trim()) {
      args.push(query.trim())
    }

    try {
      const { stdout, stderr } = await execFileAsync("npx", args, {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024,
      })

      return JSON.stringify({
        ok: true,
        command: `npx ${args.join(" ")}`,
        query: query ?? "",
        results: parseSearchOutput(stdout),
        output: stdout.trim(),
        warnings: stderr.trim() ? [stderr.trim()] : [],
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return JSON.stringify({
        ok: false,
        command: `npx ${args.join(" ")}`,
        error: `openkit_search_failed: ${message}`,
      })
    }
  },
})
