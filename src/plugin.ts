import { createInstallerPlugin } from "./install"

/**
 * Installer plugin — copies file-based extensions from this package's
 * `opencode/` directory into the project's `.opencode/` on load.
 */
export const plugin = createInstallerPlugin({
  name: "openkit",
})
