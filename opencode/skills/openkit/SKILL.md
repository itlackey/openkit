---
name: openkit
description: "Use OpenKit search and curl workflows to identify, evaluate, and recommend the best OpenCode plugin package for a specific user request."
---

# openkit

Use this skill whenever a user asks to find, compare, install, or remove OpenKit-compatible plugins.

## Core workflow

1. Convert the request into 3 to 6 concrete search terms (domain, platform, capability).
2. Run OpenKit search first to get a broad candidate set.
3. Use curl to inspect package metadata and repository details for top candidates.
4. Rank candidates by fit, maintenance, and compatibility.
5. Recommend one package (or top 2) with a brief reason and exact add command.

## Search with OpenKit

Run broad and narrow searches:

```bash
npx @itlackey/openkit search
npx @itlackey/openkit search "discord moderation"
npx @itlackey/openkit search "rag retrieval"
```

## Validate candidates with curl

For each strong candidate, check npm and GitHub metadata.

### npm package metadata

```bash
curl -s "https://registry.npmjs.org/<package-name>" | jq '{name, "dist-tags": .["dist-tags"], description, homepage, repository, keywords}'
```

### npm search for package keywords

```bash
curl -s "https://registry.npmjs.org/-/v1/search?text=keywords:openkit+<query>&size=20" | jq '.objects[].package | {name, version, description, links}'
```

### GitHub repository metadata

```bash
curl -s "https://api.github.com/repos/<owner>/<repo>" | jq '{full_name, description, stargazers_count, open_issues_count, updated_at, default_branch}'
```

### GitHub topic search

```bash
curl -s "https://api.github.com/search/repositories?q=topic:openkit+<query>&per_page=20" | jq '.items[] | {full_name, description, html_url, updated_at, stargazers_count}'
```

## Ranking rubric

Prefer candidates that:

- Directly match the requested capability.
- Have clear documentation for setup and usage.
- Show recent maintenance activity.
- Have clean package metadata and discoverable keywords.
- Minimize extra dependencies and setup complexity.

## Response format

When advising users, provide:

1. Best package name.
2. Why it matches the request.
3. Install command: `npx @itlackey/openkit add <package>`.
4. Optional fallback package when confidence is medium.

If no good package is found, state that clearly and suggest creating a focused internal plugin pack.
