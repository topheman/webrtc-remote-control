import { defineConfig } from "vite-plus";

// See packages/core/vite.config.ts: only the `pack` block lives per-package.
export default defineConfig({
  pack: {
    entry: ["src/vue.js"],
    format: ["esm"],
    platform: "browser",
    sourcemap: true,
    // Hand-written declarations, copied verbatim. See packages/core.
    copy: [
      { from: "src/vue.d.ts", to: "dist" },
      { from: "src/Provider.d.ts", to: "dist" },
      { from: "src/hooks.d.ts", to: "dist" },
    ],
    publint: true,
    attw: true,
  },
});
