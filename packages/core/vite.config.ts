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
    entry: ["src/index.js", "src/master.js", "src/remote.js"],
    format: ["esm"],
    platform: "browser",
    sourcemap: true,
    // The sources are still JavaScript and the declarations next to them are
    // hand-written, so there is nothing for tsdown to generate from: `dts`
    // stays off and the files are copied verbatim instead. Phase 5 ports the
    // sources to TypeScript, deletes the hand-written declarations and turns
    // `dts` on, at which point this `copy` block goes away.
    copy: [
      { from: "src/index.d.ts", to: "dist" },
      { from: "src/master.d.ts", to: "dist" },
      { from: "src/remote.d.ts", to: "dist" },
      // Not a public subpath, but master.d.ts and remote.d.ts import it.
      { from: "src/common.d.ts", to: "dist" },
    ],
    // Catch a broken exports map before publish rather than after.
    publint: true,
    attw: true,
  },
});
