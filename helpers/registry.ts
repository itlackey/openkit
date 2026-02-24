/**
 * Search npm registry and GitHub for openkit-compatible packages and repos.
 */

export interface SearchResult {
  name: string
  description: string
  version?: string
  source: "npm" | "github"
  url: string
}

/**
 * Search the npm registry for packages matching the query that include
 * openkit-related keywords (`openkit`, `opencode-plugin`).
 */
export async function searchNpm(query?: string): Promise<SearchResult[]> {
  const keyword = "openkit"
  const text = query ? `keywords:${keyword} ${query}` : `keywords:${keyword}`
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=25`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`npm registry search failed: ${res.status} ${res.statusText}`)
  }

  const body = (await res.json()) as {
    objects: {
      package: { name: string; description?: string; version: string; links?: { npm?: string } }
    }[]
  }

  return body.objects.map((o) => ({
    name: o.package.name,
    description: o.package.description ?? "",
    version: o.package.version,
    source: "npm" as const,
    url: o.package.links?.npm ?? `https://www.npmjs.com/package/${o.package.name}`,
  }))
}

/**
 * Search GitHub repositories that have the `openkit` topic.
 */
export async function searchGitHub(query?: string): Promise<SearchResult[]> {
  const q = query ? `topic:openkit ${query}` : `topic:openkit`
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=25`

  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "openkit-cli" },
  })
  if (!res.ok) {
    throw new Error(`GitHub search failed: ${res.status} ${res.statusText}`)
  }

  const body = (await res.json()) as {
    items: { full_name: string; description?: string; html_url: string }[]
  }

  return body.items.map((r) => ({
    name: r.full_name,
    description: r.description ?? "",
    source: "github" as const,
    url: r.html_url,
  }))
}

/**
 * Search both npm and GitHub, combining results. Errors from either source
 * are logged but do not prevent the other source from returning results.
 */
export async function search(query?: string): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const errors: string[] = []

  const [npmResults, ghResults] = await Promise.allSettled([
    searchNpm(query),
    searchGitHub(query),
  ])

  if (npmResults.status === "fulfilled") {
    results.push(...npmResults.value)
  } else {
    errors.push(`npm: ${npmResults.reason}`)
  }

  if (ghResults.status === "fulfilled") {
    results.push(...ghResults.value)
  } else {
    errors.push(`GitHub: ${ghResults.reason}`)
  }

  for (const err of errors) {
    console.warn(`[openkit] search warning: ${err}`)
  }

  return results
}
