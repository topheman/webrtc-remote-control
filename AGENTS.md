# AGENTS.md

Guidance for AI agents working in this repository. It describes the repo **as it stands
today**, not what it is being migrated toward.

> If `plan.local/modernization-plan.md` exists in your checkout, read it before changing
> anything about the build, test or lint configuration. It is gitignored working state,
> so outside contributors will not have it.

## What this is

`webrtc-remote-control` is a thin abstraction over [peerjs](https://peerjs.com/) for
building WebRTC data-channel apps with a "master" screen and one or more "remote"
screens. Three published packages plus one private demo, in a pnpm workspace.

| Path             | Package                        | Published   |
| ---------------- | ------------------------------ | ----------- |
| `packages/core`  | `@webrtc-remote-control/core`  | yes         |
| `packages/react` | `@webrtc-remote-control/react` | yes         |
| `packages/vue`   | `@webrtc-remote-control/vue`   | yes         |
| `demo`           | `@webrtc-remote-control/demo`  | no, private |

The library is small - roughly 800 lines across the three packages. The demo is the bulk
of the repo.

**The demo stays in this repository.** Do not propose extracting it. It proves the
published packages work, it hosts the end-to-end suite, and it is the example users are
pointed at.

## Layout worth knowing

`packages/core` carries **three** `package.json` files. `master/package.json` and
`remote/package.json` exist only to give microbundle a build root for the
`@webrtc-remote-control/core/master` and `/remote` subpath exports. They are not separate
packages in any other sense.

```
packages/core/
  src/core.index.js          # the "." export
  master/src/core.master.js  # the "./master" export
  remote/src/core.remote.js  # the "./remote" export
  shared/common.js           # shared utilities, not a public subpath
  test.helpers.js            # fake peer/connection + a console silencer
```

The `.d.ts` files sitting next to each source file are **hand-written**, not build
output. Editing a signature means editing its `.d.ts` by hand - and `vp check` type-checks
them, so a loose signature is now an error rather than something nobody notices.

The react and vue packages depend on `@webrtc-remote-control/core` with the `workspace:^`
protocol, so pnpm symlinks it to `packages/core`. The root `vite.config.ts` aliases
that specifier to the core **source**, so unit tests never need a build. At publish time
`changeset publish` delegates to `pnpm publish`, which rewrites `workspace:^` into a
real range in the tarball - publishing with `npm` directly would ship the literal
`workspace:^` and break the package.

## Commands that work today

Run from the repo root unless noted. The toolchain is [Vite+](https://viteplus.dev), so
`vp` drives installs, the dev server, builds, tests, linting and formatting. The root
`package.json` scripts wrap it, and either form works.

| Command                                                        | What it does                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `vp install`                                                   | installs and links every workspace package                               |
| `pnpm run build` (`vp run -r build`)                           | builds core, react, vue (microbundle) then the demo, in dependency order |
| `pnpm run dev` (`vp run -r --parallel dev`)                    | watch mode for all four packages at once                                 |
| `vp check`                                                     | Oxfmt, Oxlint and tsgolint in one pass - what CI gates on                |
| `pnpm run lint` (`vp lint`)                                    | Oxlint only                                                              |
| `pnpm run format` (`vp fmt`)                                   | Oxfmt over the whole repo                                                |
| `pnpm test` (`vp test run`)                                    | unit tests: core, react, vue, demo                                       |
| `pnpm run test:watch`                                          | the same suite in watch mode                                             |
| `pnpm run test:core` / `test:react` / `test:vue` / `test:demo` | one Vitest project, with a `:watch` variant each                         |
| `pnpm run test:e2e`                                            | Puppeteer + jest-cucumber suite, needs a server already running          |
| `pnpm run test:e2e:start-server-and-test`                      | builds nothing, previews the demo and runs e2e against it                |
| `pnpm run peer-server`                                         | local peerjs signaling server on port 9000                               |
| `pnpm changeset`                                               | records a version bump for the next release                              |

`vp dev`, `vp build` and `vp preview` refuse to guess a target at the workspace root.
`defaultPackage` in `vite.config.ts` points them at the demo, so bare `vp dev` does the
obvious thing; reach a library with `vp -C packages/core <command>`.

The public peerjs signaling server is unreliable, so CI builds with
`pnpm run build:peer-server` and runs e2e against a local signaling server. The
`:peer-server` variants of the dev, preview and e2e scripts do the same locally. They are
built on `start-server-and-test`, which waits for the signaling server to answer on port
9000 before starting the thing that needs it, and tears it down afterwards.

`vp` manages Node.js and the package manager itself; the versions come from
`.node-version` and `packageManager` in the root `package.json`. A global `vp` is not
required: `vite-plus` is a normal dependency, so `pnpm install` links `node_modules/.bin/vp`
and every `pnpm run` script resolves it from there. That is how Vercel and any contributor
without the toolchain installed still build. Postinstall scripts are opt-in: `pnpm-workspace.yaml` has an `allowBuilds` block, and a new dependency that needs
one has to be added there (`pnpm approve-builds` writes it).

`.npmrc` sets `min-release-age=2`, so a dependency published less than two days ago is not
installed. pnpm's response to a range that can only be satisfied by a too-new version is to
add it to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` and install it anyway, which
defeats the setting. Pin the range to the newest version that passes instead.

The demo deploys to Vercel, whose project settings live in the dashboard rather than in
the repo. The one exception is `vercel.json`, which pins `installCommand` to pnpm: the
dashboard still carried an `npm install` override from before the pnpm migration, and
settings in `vercel.json` take precedence over the dashboard. npm cannot resolve the
`catalog:` protocol, so a preview deploy installing with npm fails outright.

Releases run on Changesets with independent versions, driven by
`.github/workflows/release.yml`. That workflow picks between versioning and publishing
with `changesets/action/select-mode`, and publishes through npm trusted publishing
(OIDC), so there is no `NPM_TOKEN` secret - only the publish job gets `id-token: write`.
The trusted publisher registered on npmjs.com names `release.yml`, so renaming that file
breaks publishing until npmjs.com is updated to match.

Both workflows set up through `voidzero-dev/setup-vp`, pinned to an exact release, which
replaces the separate `pnpm/action-setup` and `actions/setup-node` steps and reads the vp
version from the `vite-plus` catalog entry. Dependabot bumps the pin weekly.

## One config file

`vite.config.ts` at the root is the only tool configuration in the repo. It holds the
`lint`, `fmt`, `staged` and `test` blocks; there is no `.eslintrc`, `.prettierrc`,
`vitest.config`, or lint-staged block in `package.json` any more.

Unit tests are Vitest, driven by the `test.projects` array in that file, one project per
package. There are no per-package test configs and no per-package `test` scripts:
everything runs from the root. Two things are easy to trip over:

- Every project sets `extends: true` explicitly. Vite+ 0.3.1 bundles Vitest 4.1.11, where
  inline projects do **not** inherit the root config by default - that only became the
  default in Vitest 5. Drop it and the projects silently lose `environment: "jsdom"`,
  `globals: false`, the React plugin and the core alias, and roughly two thirds of the
  suite fails.
- Test globals are **not** injected, so every test file imports `describe`, `it`, `expect`
  and `vi` from `vite-plus/test`, and suites using Testing Library call `cleanup()`
  themselves.

Linting is Oxlint. The old airbnb-base / react / react-hooks / jsx-a11y ESLint stack was
mapped across by hand: `vp migrate` only converts ESLint automatically from a v9 flat
config, and this repo was on v8 with `.eslintrc.js`. Oxlint's `vue` plugin covers the
script block of an SFC, not the template, so the seven components under
`demo/counter-vue` are only half linted - `eslint-plugin-vue`'s template rules have no
equivalent.

Git hooks go through the Vite+ dispatcher rather than husky. `.vite-hooks/pre-commit` runs
`vp staged`, which applies the `staged` block; `.vite-hooks/commit-msg` runs commitlint.
Both are project-owned and committed; the generated dispatcher under `.vite-hooks/_`
is gitignored and recreated by the `prepare` script (`vp config --no-agent`), which is
what `husky install` used to do. `VP_GIT_HOOKS=0` skips hooks, the way `HUSKY=0` used to,
and `vp hooks status` says whether they are actually wired up in this clone. CI, the
release workflow and Vercel all set `VP_GIT_HOOKS=0`, because none of them should be
installing hooks - and the release workflow in particular commits a changesets-generated
"Version Packages" subject that commitlint would reject.

`.vscode/` points the editor at the same thing: the Oxc extension formats and lints from
the `fmt` and `lint` blocks above, so format-on-save and `vp check` cannot disagree. The
per-language `editor.defaultFormatter` overrides are deliberate - VS Code ranks a
user-level `[language]` setting above a workspace-level one, so without them a
contributor's global Prettier silently takes over.

End-to-end tests are still Jest 27 with Babel - jest-puppeteer driving Gherkin features
in `demo/__integration__`. That is the only remaining use of Jest in the repo, which is
why `demo` keeps `jest`, `@babel/preset-env` and `demo/babel.config.js`.

## Things that are already broken by age

- microbundle is effectively unmaintained. It still builds all three packages; `vp pack`
  replaces it in a later phase.
- There are `console.log` calls shipped in `core.master.js`, `core.remote.js`,
  `vue/hooks.js`, `vue/Provider.js` and `react/Provider.jsx`. `no-console` is set to
  `warn` in `vite.config.ts` so they do not fail `vp check`; once they are gone the rule
  becomes `["error", { allow: ["warn", "error"] }]`.

## Conventions

- Commits follow Conventional Commits; commitlint runs on the commit-msg hook.
- Pull request titles follow Conventional Commits too. Pull requests are merged with
  squash and merge, so the title becomes the commit subject on the target branch
  (`chore: some subject (#20)`). Nothing validates it at merge time - the commit-msg hook
  only sees local commits - so it has to be written correctly up front. Descriptive prose
  belongs in the pull request body.
- Oxfmt is the formatter, configured by the `fmt` block in `vite.config.ts`. It is kept at
  Prettier's `printWidth` of 80 rather than Oxfmt's default of 100, so adopting it did not
  rewrap the repo. `vp check --fix` formats and fixes lint in one go.
- Tests sit next to the code they cover (`*.test.js`), not in a separate tree.
- Pull requests that change a published package carry a changeset.
