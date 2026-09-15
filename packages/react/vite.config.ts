import { defineConfig } from "vite-plus";

// See packages/core/vite.config.ts: only the `pack` block lives per-package.
export default defineConfig({
  pack: {
    entry: ["src/react.ts"],
    format: ["esm"],
    platform: "browser",
    sourcemap: true,
    // JSX is compiled to React.createElement rather than the automatic runtime,
    // matching what microbundle did. `peerDependencies` still allows React
    // >=16.8, and the automatic runtime needs 16.14.
    inputOptions: { transform: { jsx: { runtime: "classic" } } },
    // The sources are TypeScript, so tsdown generates the declarations. The
    // hand-written ones that used to be copied verbatim are frozen under
    // `legacy-types/`, where `src/assignability.test-d.ts` checks the generated
    // output against them.
    dts: true,
    publint: true,
    attw: true,
  },
});
