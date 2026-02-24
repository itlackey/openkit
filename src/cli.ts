#!/usr/bin/env node

import { add } from "./add"
import { remove } from "./remove"
import { search, type SearchResult } from "./registry"

const HELP = `
openkit — CLI for managing OpenCode extension packages

Usage:
  openkit add <package>      Add an openkit package to your project
  openkit remove <package>   Remove an openkit package from your project
  openkit search [query]     Search for openkit-compatible packages
  openkit help               Show this help message

Examples:
  openkit add @example/opencode-helpers
  openkit remove @example/opencode-helpers
  openkit search code-review
`.trim()

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP)
    return
  }

  switch (command) {
    case "add": {
      const packageName = args[1]
      if (!packageName) {
        console.error("Error: package name is required\n")
        console.error("Usage: openkit add <package>")
        process.exitCode = 1
        return
      }
      await add(packageName, process.cwd())
      break
    }

    case "remove": {
      const packageName = args[1]
      if (!packageName) {
        console.error("Error: package name is required\n")
        console.error("Usage: openkit remove <package>")
        process.exitCode = 1
        return
      }
      await remove(packageName, process.cwd())
      break
    }

    case "search": {
      const query = args.slice(1).join(" ") || undefined
      const results = await search(query)
      printSearchResults(results, query)
      break
    }

    default:
      console.error(`Unknown command: ${command}\n`)
      console.log(HELP)
      process.exitCode = 1
  }
}

function printSearchResults(results: SearchResult[], query?: string): void {
  if (results.length === 0) {
    console.log(query ? `No openkit packages found for "${query}".` : "No openkit packages found.")
    return
  }

  const npmResults = results.filter((r) => r.source === "npm")
  const ghResults = results.filter((r) => r.source === "github")

  if (npmResults.length > 0) {
    console.log(`\nnpm packages (${npmResults.length}):`)
    for (const r of npmResults) {
      const ver = r.version ? ` (${r.version})` : ""
      console.log(`  ${r.name}${ver}`)
      if (r.description) console.log(`    ${r.description}`)
    }
  }

  if (ghResults.length > 0) {
    console.log(`\nGitHub repositories (${ghResults.length}):`)
    for (const r of ghResults) {
      console.log(`  ${r.name}`)
      if (r.description) console.log(`    ${r.description}`)
      console.log(`    ${r.url}`)
    }
  }

  console.log()
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`[openkit] error: ${message}`)
  process.exitCode = 1
})
