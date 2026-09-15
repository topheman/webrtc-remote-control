import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const corePath = fileURLToPath(
  new URL("./packages/core/src/core.index.js", import.meta.url),
);

// One config for the whole workspace. Inline projects inherit everything below
// them by default (Vitest 5 `extends`), so environment, plugins and aliases are
// declared once here and each project only states what makes it different.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Tests run against the core source rather than its build output, so the
      // whole suite stays independent of microbundle.
      "@webrtc-remote-control/core": corePath,
    },
  },
  server: {
    // microbundle's scratch directory, written to by `pnpm run dev`
    watch: { ignored: ["**/.tmp/**"] },
  },
  test: {
    environment: "jsdom",
    // Test globals are imported explicitly by every test file.
    globals: false,
    projects: [
      { test: { name: "core", root: "./packages/core" } },
      { test: { name: "react", root: "./packages/react" } },
      { test: { name: "vue", root: "./packages/vue" } },
      { test: { name: "demo", root: "./demo" } },
    ],
  },
});
