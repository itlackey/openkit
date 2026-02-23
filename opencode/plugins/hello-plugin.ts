import { type Plugin, tool } from "@opencode-ai/plugin"

/**
 * Example file-based plugin.
 *
 * File-based plugins live in `.opencode/plugins/` and are loaded automatically
 * by OpenCode. They have access to the full Plugin API: events, hooks, tools,
 * auth, and more.
 *
 * This example registers a custom tool and listens for session events.
 */
export const plugin: Plugin = async (input) => {
  return {
    // Register custom tools programmatically
    tool: {
      greet: tool({
        description: "Greet someone by name (example plugin-registered tool).",
        args: {
          name: tool.schema.string().describe("Name of the person to greet"),
        },
        async execute({ name }) {
          return `Hello, ${name}! This response came from the greet tool registered by hello-plugin.`
        },
      }),
    },

    // Listen for events
    event: async ({ event }) => {
      if (event.type === "session.created") {
        console.log("[hello-plugin] session started")
      }
    },
  }
}
