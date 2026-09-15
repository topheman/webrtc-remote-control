import { defineConfig } from "vite-plus";

// Only the `pack` block lives here. Lint, format and test settings stay in the
// root config; this file exists because entries, externals and declarations are
// per-package concerns.
export default defineConfig({
  pack: {
    // The three public subpaths. `master/` and `remote/` used to carry a
    // `package.json` apiece, both to give microbundle a build root and to let
    // pre-`exports` resolvers walk into the directory. tsdown takes multiple
    // entries, so one build root now serves all three, and the `exports` map
    // in package.json is the only thing resolving the subpaths.
    entry: ["src/index.ts", "src/master.ts", "src/remote.ts"],
    format: ["esm"],
    platform: "browser",
    sourcemap: true,
    // The sources are TypeScript, so tsdown generates the declarations. The
    // hand-written ones that used to be copied verbatim are frozen under
    // `legacy-types/`, where `src/assignability.test-d.ts` checks the
    // generated output against them.
    dts: true,
    // Catch a broken exports map before publish rather than after.
    publint: true,
    attw: true,
  },
});
