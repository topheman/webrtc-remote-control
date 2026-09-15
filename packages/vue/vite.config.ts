import { defineConfig } from "vite-plus";

// See packages/core/vite.config.ts: only the `pack` block lives per-package.
export default defineConfig({
  pack: {
    entry: ["src/vue.ts"],
    format: ["esm"],
    platform: "browser",
    sourcemap: true,
    // The sources are TypeScript, so tsdown generates the declarations. The
    // hand-written ones that used to be copied verbatim are frozen under
    // `legacy-types/`, where `src/assignability.test-d.ts` checks the generated
    // output against them.
    dts: true,
    publint: true,
    attw: true,
  },
});
