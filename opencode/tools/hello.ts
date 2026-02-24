import { tool } from "@opencode-ai/plugin";
/**
 * Custom tool example (loaded from .opencode/tools/*.ts or ~/.config/opencode/tools/*.ts).
 *
 * Name will be: hello (filename) by default.
 */
export default tool({
  description: "Echo a message back with a small prefix (example custom tool).",
  args: {
    message: tool.schema.string().describe("Message to echo back"),
  },
  async execute({ message }, context) {
    return `hello-tool: ${message}`;
  },
});

// Example of multiple exports in one file if you want:
// export const echo = tool({ ... })  -> name would be hello_echo
