# AGENTS.md

Guidance for AI agents working in this repository. It describes the repo **as it stands
today**, not what it is being migrated toward.

> If `plan.local/modernization-plan.md` exists in your checkout, read it before changing
> anything about the build, test or lint configuration. It is gitignored working state,
> so outside contributors will not have it.

## What this is

`webrtc-remote-control` is a thin abstraction over [peerjs](https://peerjs.com/) for
building WebRTC data-channel apps with a "master" screen and one or more "remote"
screens. Three published packages plus one private demo, in a Lerna monorepo.

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
  test.helpers.js            # fake peer/connection + console and sessionStorage mocks
```

The `.d.ts` files sitting next to each source file are **hand-written**, not build
output. Editing a signature means editing its `.d.ts` by hand.

The react and vue packages depend on `@webrtc-remote-control/core` with the `workspace:^`
protocol, so pnpm symlinks it to `packages/core`. Their Jest configs map that specifier
to the core **source**, so unit tests never need a build. At publish time
`changeset publish` delegates to `pnpm publish`, which rewrites `workspace:^` into a
real range in the tarball - publishing with `npm` directly would ship the literal
`workspace:^` and break the package.

## Commands that work today

Run from the repo root unless noted.

| Command                                                        | What it does                                                    |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| `pnpm install`                                                 | installs and links every workspace package                      |
| `pnpm run build`                                               | builds core, react, vue (microbundle) then the demo (Vite)      |
| `pnpm run dev`                                                 | watch mode for all four packages in parallel                    |
| `pnpm run lint`                                                | ESLint over the whole repo                                      |
| `pnpm test`                                                    | unit tests: core, react, vue, demo                              |
| `pnpm run test:core` / `test:react` / `test:vue` / `test:demo` | one package's unit tests                                        |
| `pnpm run test:e2e`                                            | Puppeteer + jest-cucumber suite, needs a server already running |
| `pnpm run test:e2e:start-server-and-test`                      | builds nothing, previews the demo and runs e2e against it       |
| `pnpm run peer-server`                                         | local peerjs signaling server on port 9000                      |
| `pnpm changeset`                                               | records a version bump for the next release                     |

The public peerjs signaling server is unreliable, so CI builds with
`pnpm run build:peer-server` and runs e2e against a local signaling server. The
`:peer-server` variants of the dev, preview and e2e scripts do the same locally.

The package manager is pnpm, pinned through `packageManager` in the root `package.json`.
Postinstall scripts are opt-in: `pnpm-workspace.yaml` has an `allowBuilds` block, and a
new dependency that needs one has to be added there (`pnpm approve-builds` writes it).

Releases run on Changesets with independent versions, driven by
`.github/workflows/release.yml`. That workflow picks between versioning and publishing
with `changesets/action/select-mode`, and publishes through npm trusted publishing
(OIDC), so there is no `NPM_TOKEN` secret - only the publish job gets `id-token: write`.
The trusted publisher registered on npmjs.com names `release.yml`, so renaming that file
breaks publishing until npmjs.com is updated to match.

Unit tests are Jest 27 with Babel. End-to-end tests are jest-puppeteer driving Gherkin
features in `demo/__integration__`.

## Things that are already broken by age

- microbundle is effectively unmaintained.
- There are `console.log` calls shipped in `core.master.js`, `core.remote.js`,
  `vue/hooks.js`, `vue/Provider.js` and `react/Provider.jsx`. ESLint reports them as
  warnings today.

## Conventions

- Commits follow Conventional Commits; commitlint runs on the commit-msg hook.
- Prettier is enforced through ESLint (`plugin:prettier/recommended`), so
  `npx eslint --fix` is the formatter.
- Tests sit next to the code they cover (`*.test.js`), not in a separate tree.
- Pull requests that change a published package carry a changeset.
