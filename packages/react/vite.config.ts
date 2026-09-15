import { defineConfig } from "vite-plus";

// See packages/core/vite.config.ts: only the `pack` block lives per-package.
export default defineConfig({
  pack: {
    entry: ["src/react.jsx"],
    format: ["esm"],
    platform: "browser",
    sourcemap: true,
    // JSX is compiled to React.createElement rather than the automatic runtime,
    // matching what microbundle did. `peerDependencies` still allows React
    // >=16.8, and the automatic runtime needs 16.14.
    inputOptions: { transform: { jsx: { runtime: "classic" } } },
    // Hand-written declarations, copied verbatim. See packages/core.
    copy: [
      { from: "src/react.d.ts", to: "dist" },
      { from: "src/Provider.d.ts", to: "dist" },
      { from: "src/hooks.d.ts", to: "dist" },
    ],
    publint: true,
    attw: true,
  },
});
