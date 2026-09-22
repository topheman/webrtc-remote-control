import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

const corePath = fileURLToPath(
  new URL("./packages/core/src/index.ts", import.meta.url),
);

// One config for the whole workspace: lint, format and test settings all live
// here rather than in per-tool files.
export default defineConfig({
  // `vp dev`, `vp build` and `vp preview` refuse to guess a target at the
  // workspace root. The demo is the only package with a Vite app, so bare
  // invocations point at it; the libraries are reached with `vp -C packages/…`.
  defaultPackage: "./demo",

  plugins: lazyPlugins(() => [react()]),

  resolve: {
    alias: {
      // Tests run against the core source rather than its build output, so the
      // whole suite stays independent of the packaging step.
      "@webrtc-remote-control/core": corePath,
    },
  },

  test: {
    environment: "jsdom",
    // Test globals are imported explicitly by every test file.
    globals: false,
    // Every project sets `extends: true` explicitly. Vite+ 0.3.1 bundles Vitest
    // 4.1.11, and inline projects only inherit the root config by default from
    // Vitest 5 on. Without it the projects silently lose `environment: "jsdom"`,
    // `globals: false`, the React plugin and the core alias above.
    projects: [
      { extends: true, test: { name: "core", root: "./packages/core" } },
      { extends: true, test: { name: "react", root: "./packages/react" } },
      { extends: true, test: { name: "vue", root: "./packages/vue" } },
      {
        extends: true,
        test: {
          name: "demo",
          root: "./demo",
          // Vitest's default `include` matches `*.spec.ts` as well as
          // `*.test.ts`, so without this it collects the Playwright suite and
          // fails on `test.extend`'s fixtures. Unit tests here are `*.test.ts`;
          // `e2e/` belongs to `pnpm run test:e2e`.
          exclude: ["e2e/**", "**/node_modules/**", "**/dist/**"],
        },
      },
    ],
  },

  // The end-to-end suite. `cache: false` because it drives real browsers
  // against real servers, so there is no input fingerprint that makes a cached
  // pass trustworthy. `dependsOn` is what guarantees the preview server in
  // `demo/playwright.config.ts` has something to serve.
  run: {
    tasks: {
      e2e: {
        // Delegates to the demo's own script rather than calling `playwright`
        // here: a task declared at the root runs with the root package's
        // `node_modules/.bin` on PATH, and Playwright is a dependency of the
        // demo.
        command: "vp run @webrtc-remote-control/demo#test:e2e",
        cache: false,
        dependsOn: ["@webrtc-remote-control/demo#build"],
      },
    },
  },

  // Replaces the airbnb-base / react / react-hooks / jsx-a11y ESLint stack.
  // `vp migrate` could not convert it automatically: that path needs ESLint 9
  // flat config and this repo was on ESLint 8 with `.eslintrc.js`, so the rules
  // below were mapped by hand.
  lint: {
    plugins: [
      "import",
      "react",
      "jsx-a11y",
      "vue",
      "vitest",
      "promise",
      "node",
    ],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    options: { typeAware: true, typeCheck: true },
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      // None of the three published packages log any more, so this is an error
      // now: a library has no business writing to the console of the
      // application embedding it. The demo is an application and is allowed to
      // keep logging - see the override below.
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
    overrides: [
      {
        // The demo is an application, not a library, and several of its pages
        // log on purpose - the accelerometer master prints every event it
        // receives, and its end-to-end suite reads them back. Demoted to
        // "warn", and the calls that are deliberate carry a disable comment, so
        // that a warning here means a stray log rather than background noise.
        // The `allow` list has to be repeated: an override replaces the rule's
        // options rather than merging with them, so spelling the severity alone
        // would start reporting `console.warn` and `console.error`.
        files: ["demo/**"],
        rules: { "no-console": ["warn", { allow: ["warn", "error"] }] },
      },
      {
        // react-three-fiber renders three.js objects as JSX intrinsics, so
        // every prop on them looks unknown to the react plugin.
        files: ["demo/accelerometer-3d/**/*.tsx"],
        rules: { "react/no-unknown-property": "off" },
      },
    ],
    ignorePatterns: ["**/dist/**", "**/build/**"],
  },

  // Replaces the lint-staged block that lived in package.json. The dispatcher
  // in .vite-hooks/pre-commit calls `vp staged`, which runs these against the
  // staged files only.
  staged: {
    "*.{js,jsx,mjs,mts,ts,tsx,vue}": "vp check --fix",
    "*.{css,html,json,md,yaml,yml}": "vp fmt",
  },

  fmt: {
    // Prettier's default, kept so the migration to Oxfmt did not rewrap the
    // whole repo. Oxfmt's own default is 100.
    printWidth: 80,
    sortPackageJson: false,
    // CHANGELOG.md files are written by Changesets, so formatting them is churn
    // that comes back on the next release.
    ignorePatterns: [
      ".git",
      "build",
      "dist",
      "package.json",
      "**/CHANGELOG.md",
    ],
  },
});
