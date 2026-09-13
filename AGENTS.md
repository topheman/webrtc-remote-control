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

The react and vue packages import the core through `@webrtc-remote-control/core`, which
resolves to `packages/core` via a symlink created by `lerna bootstrap`. Their Jest configs
map that specifier to the core **source**, so unit tests never need a build.

## Commands that work today

Run from the repo root unless noted.

| Command                                                       | What it does                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------------- |
| `npm run bootstrap`                                           | `lerna bootstrap` - installs and links every package            |
| `npm run build`                                               | builds core, react, vue (microbundle) then the demo (Vite)      |
| `npm run dev`                                                 | watch mode for all four packages in parallel                    |
| `npm run lint`                                                | ESLint over the whole repo                                      |
| `npm test`                                                    | unit tests: core, react, vue, demo                              |
| `npm run test:core` / `test:react` / `test:vue` / `test:demo` | one package's unit tests                                        |
| `npm run test:e2e`                                            | Puppeteer + jest-cucumber suite, needs a server already running |
| `npm run test:e2e:start-server-and-test`                      | builds nothing, previews the demo and runs e2e against it       |
| `npm run peer-server`                                         | local peerjs signaling server on port 9000                      |

The public peerjs signaling server is unreliable, so CI builds with
`npm run build:peer-server` and runs e2e against a local signaling server. The
`:peer-server` variants of the dev, preview and e2e scripts do the same locally.

Unit tests are Jest 27 with Babel. End-to-end tests are jest-puppeteer driving Gherkin
features in `demo/__integration__`.

## Things that are already broken by age

- `lerna bootstrap` was removed in Lerna 7, so the install step cannot be upgraded in
  place.
- microbundle is effectively unmaintained.
- There are `console.log` calls shipped in `core.master.js`, `core.remote.js`,
  `vue/hooks.js`, `vue/Provider.js` and `react/Provider.jsx`. ESLint reports them as
  warnings today.

## Conventions

- Commits follow Conventional Commits; commitlint runs on the commit-msg hook.
- Prettier is enforced through ESLint (`plugin:prettier/recommended`), so
  `npx eslint --fix` is the formatter.
- Tests sit next to the code they cover (`*.test.js`), not in a separate tree.
