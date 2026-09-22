# Contributing

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://www.conventionalcommits.org)

## Prerequisites

- Nodejs >=24 (see [.node-version](.node-version)). [.nvmrc](.nvmrc) carries the same
  version for nvm's benefit - nvm reads only that file, while the toolchain and CI read
  `.node-version`. Keep the two in step when bumping Node.
- pnpm >=12 - `corepack enable pnpm` picks up the version pinned in `packageManager`

Everything else this repository builds with comes down with `pnpm install` - see
[The toolchain](#the-toolchain) below.

## The toolchain

Everything here - installs, the dev server, builds, tests, linting, formatting and the Git
hooks - runs through [Vite+](https://viteplus.dev) and its `vp` binary. There is no ESLint,
Prettier, Jest, Babel, microbundle, husky or lint-staged left in the repository, and no
`.eslintrc`, `.prettierrc` or `vitest.config.ts` either: the `lint`, `fmt`, `staged` and `test`
blocks all live in the root [`vite.config.ts`](vite.config.ts).

**The `pnpm run` scripts need nothing installed globally.** `vite-plus` is an ordinary
dependency, so `pnpm install` links `node_modules/.bin/vp` and every script resolves it from
there. That is how Vercel and CI build the project, and it is enough for everything documented
below. Each script is a thin wrapper, so `pnpm test` and `vp test run` are the same command.

Typing `vp` directly is a convenience rather than a requirement. It needs `vp` on your PATH -
either installed globally, or reached through `pnpm exec vp`. It is worth having for the
subcommands no script wraps. Three of them have no obvious target at the workspace root:
`vp dev`, `vp build` and `vp preview` fall back to `defaultPackage` in `vite.config.ts`, which
points at the demo. To reach one of the libraries instead, pass its directory:

```sh
pnpm exec vp -C packages/core build
```

Vite+ is a 0.x release on a roughly fortnightly cadence, so `vite-plus` and the
`voidzero-dev/setup-vp` action CI uses are pinned to exact versions rather than caret ranges.
Dependabot bumps them.

### Why TypeScript is pinned at 6.0.3

One TypeScript for the whole repository, pinned exactly, at the root.

`vp check` never calls `tsc` - it type checks through **tsgolint**, built on the TypeScript Go
toolchain - so the installed `typescript` package is only read by two things: tsdown's
declaration generation inside `vp pack`, and the editor's language service. That leaves
`vue-tsc` as the binding constraint. It cannot run on TypeScript 7.0, which ships no stable
programmatic API, and the seven single file components under `demo/counter-vue` are the one part
of the repository `vp check` cannot read - so `pnpm run typecheck:vue` has to keep working.

Revisit when TypeScript 7.1 restores the programmatic API and `vue-tsc` follows. At that point
it is a one-line bump.

## Setup

This project is organized as a monorepo, with [pnpm workspaces](https://pnpm.io/workspaces). The
following installs dependencies for every workspace package and links them together.

```sh
pnpm install
pnpm run test:e2e:install # optional (if you want to run e2e test in local)
```

The second command downloads the Chromium build Playwright drives. It is a few hundred
megabytes and is not fetched by `pnpm install`, so skip it unless you intend to run
`pnpm run test:e2e`.

## Commonly used scripts

- `pnpm run build`: builds all the packages + demo (you can use some more specific scripts)
  - `pnpm run build:peer-server`: same, preparing for using a local signaling server
- `pnpm run dev`: build the packages + demo in watch mode and dev mode (you can use some more specific scripts)
  - `pnpm run dev:peer-server`: same, using a local signaling server
- `pnpm run preview`: launch the built version
  - `pnpm run preview:peer-server`: same using a local signaling server
- `pnpm run check`: Oxfmt, Oxlint and tsgolint in one pass - this is the command CI gates on, and `pnpm run check --fix` formats and fixes what it can
- `pnpm run typecheck:vue`: `vue-tsc --noEmit` over the Vue demo, which tsgolint cannot read. It resolves the three packages through their built declarations, so run a build first
- `pnpm run lint`: Oxlint on its own
- `pnpm run format`: Oxfmt over the whole repository
- `pnpm test`: runs unit tests (you can use some more specific scripts)
- `pnpm run test:e2e:install`: downloads the Chromium build Playwright needs - run it once per clone
- `pnpm run test:e2e`: runs the end-to-end tests. It builds the demo, starts a local signaling server and a preview server, runs all three demo modes, and shuts the servers down again - nothing needs to be running beforehand
  - `pnpm run test:e2e --project=vue`: one demo mode only (`vanilla`, `react` or `vue`). Do not write `-- --project=vue`: pnpm passes everything after the script name through verbatim, so the `--` reaches Playwright as a literal argument and the whole suite runs
  - `pnpm run test:e2e:ui`: Playwright's UI mode, for stepping through a scenario
  - `pnpm run test:e2e:headed`: the same run with a visible browser
  - `pnpm run test:e2e:report`: opens the HTML report of the last run

## Using the local peer server

By default, you can use the signaling server of peerjs (no need to deploy your own).

For some reason, you may want to run your code against a local signaling server. You can launch a signaling server with the following command in a tab:

```sh
pnpm run peer-server
```

Then on an other tab, set the env var `VITE_USE_LOCAL_PEER_SERVER=true`

```sh
VITE_USE_LOCAL_PEER_SERVER=true pnpm run dev # also works with pnpm run build
```

## Editor

[`.vscode/extensions.json`](.vscode/extensions.json) recommends the three extensions this setup
wants: the Vite+ extension pack, Volar for the Vue demo and Playwright's. The Oxc extension
formats and lints from the same `fmt` and `lint` blocks `vp check` reads, so format-on-save and
CI cannot disagree.

[`.vscode/settings.json`](.vscode/settings.json) repeats `editor.defaultFormatter` per language
on purpose. VS Code ranks a user-level `[language]` setting above a workspace-level one, so
without those lines a contributor's global Prettier quietly takes over and every save fights the
repository's formatting.

One gap worth knowing about: Oxlint's `vue` plugin covers the script block of a single file
component, not the template, and `eslint-plugin-vue`'s template rules have no equivalent. The
seven components under `demo/counter-vue` are therefore only half linted. Their templates are
still type checked, by `pnpm run typecheck:vue`.

## Git hooks

Hooks run through the Vite+ dispatcher rather than husky. Two of them are committed:
[`.vite-hooks/pre-commit`](.vite-hooks/pre-commit) runs `vp staged`, which applies the `staged`
block of the root `vite.config.ts`, and [`.vite-hooks/commit-msg`](.vite-hooks/commit-msg) runs
commitlint. The generated dispatcher under `.vite-hooks/_` is gitignored and written by the
`prepare` script on install, which is what `husky install` used to do.

- `pnpm exec vp hooks status` tells you whether the hooks are actually wired up in your clone
- `VP_GIT_HOOKS=0` skips them for a single command, the way `HUSKY=0` used to

## Adding dependencies

Add dependencies to a specific workspace package with `pnpm --filter`, run from the repo root.

Examples:

```sh
pnpm --filter @webrtc-remote-control/react add -D publint
pnpm --filter @webrtc-remote-control/react add prop-types
pnpm --filter @webrtc-remote-control/react add -P "react@>=16.8.0"
pnpm --filter @webrtc-remote-control/demo add react vue
```

Dependencies between the packages of this repo use the `workspace:^` protocol, so they resolve to
the local sources. `changeset publish` detects the workspace tool and delegates to `pnpm publish`,
which rewrites `workspace:^` into a real range in the published tarball.

Dependencies used by more than one workspace package go in the `catalog` block of
[`pnpm-workspace.yaml`](pnpm-workspace.yaml), which keeps them pinned to one version in one
place. Postinstall scripts are opt-in: a new dependency that needs to run one has to be listed
under `allowBuilds` in the same file, which `pnpm approve-builds` writes for you.

## Releasing

Releases go through [Changesets](https://github.com/changesets/changesets), with independent
versions per package.

Every pull request that changes a published package should carry a changeset:

```sh
pnpm changeset
```

That writes a markdown file under `.changeset/` describing the bump and the changelog entry. Commit
it alongside your changes.

On `master`, the `release` workflow decides what to do from the repository state:

- pending changesets exist → it opens (and keeps updated) a "version packages" pull request that
  consumes them, bumps versions and updates the changelogs
- no pending changesets, versions ahead of the registry → it builds and publishes to npm

So merging the "version packages" pull request is what triggers a release.

### npm authentication

There is no `NPM_TOKEN` secret. Publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/):
the publish job mints a short-lived OIDC token (`id-token: write`) that npm exchanges for publish
credentials, so no long-lived token is stored anywhere.

This needs a one-time setup on npmjs.com, **for each of the three published packages**
(`@webrtc-remote-control/core`, `/react`, `/vue`). Under the package's _Settings → Trusted publisher_,
add a GitHub Actions publisher with:

| Field             | Value                   |
| ----------------- | ----------------------- |
| Organization/user | `topheman`              |
| Repository        | `webrtc-remote-control` |
| Workflow filename | `release.yml`           |
| Environment       | `Production`            |

The publish job declares `environment: Production`, so the OIDC token it mints carries that
environment in its claims. npm checks the claim against the trusted publisher, so the field has to
match exactly - leaving it empty makes npm reject a token that names an environment.

Until that is configured, the publish job will fail to authenticate. Versioning and the release pull
request work regardless.

## Environment variables

You can pass environment variables at build time **before publish** via tsdown, which backs `vp pack` - [see docs](https://tsdown.dev/options/define).

Nothing in the repo relies on this today. It used to produce the production (minified) and development (unminified) UMD builds, which the packages no longer ship.

## https

WebRTC (and other APIs like the accelerometer) only work on secure origins (localhost is considered secure). The app will work in development if you test it on `localhost` (which is considered secure by browsers), on multiple tabs.

However, if you try to access the app from your local ip (like 192.168.1.1) from your laptop or your mobile, it won't work, since the domain will be recognized as unsecure.

So to test on multiple devices, you'll need an https tunnel: a utility that exposes your local dev server on a public address and forwards traffic to it over https.

The repo provides no task for this - starting the tunnel is up to you, because the right choice depends on what you already have installed and whether you want an account. Any of these work:

- [ngrok](https://ngrok.com/) - needs a free account and an auth token, once
- [`cloudflared tunnel --url`](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/) - no account
- [`tailscale funnel`](https://tailscale.com/kb/1223/funnel) - if you already run Tailscale

Start the app on port 3000 first, then point the tunnel at it. With ngrok:

```bash
pnpm run dev       # or: pnpm run build && pnpm run preview
ngrok http 3000    # in a second terminal
```

The public https address is printed in your terminal. Keep in mind you won't reach your app over your local network but through the internet, which can take longer - use it only to test WebRTC on mobile devices.

## e2e tests

In the [demo](demo#readme), you'll find a version of the counter app for each implementation of webrtc-remote-control (vanilla, react, vue). The UI relies on the same web-components.

The exact same [test suite](demo/e2e/) runs on each counter app - it is a [Playwright](https://playwright.dev/) suite, with one project per mode. If you want to contribute and add support for your framework of choice:

- add the implementation of webrtc-remote-control for your framework
- make a counter app (using the existing web-components)
- add a project for it in [`demo/playwright.config.ts`](demo/playwright.config.ts) and an entry in `MASTER_PAGES` in [`demo/e2e/fixtures.ts`](demo/e2e/fixtures.ts)
- ensure the tests pass

The suite always signals through a local peer server, which `pnpm run test:e2e` starts for you. It has no fixed waits and no retries: every assertion polls until the peers have actually connected, so a scenario takes as long as the connection takes. If a test only passes on a second run, treat that as a bug worth chasing rather than flakiness worth retrying.

## PeerJS

[PeerJS](https://peerjs.com/) is a wrapper around the WebRTC browser's APIs. It provides a signaling server for free (which means you don't have to setup any backend server).

Thanks to PeerJS, you don't have to bother directly about:

- the **signaling server** - you already have one for free which relies on websocket
- issue and exchange **offers** and **answers** (<abbr title="Session Description Protocol format">SDP</abbr> session description)
- exchange <abbr title="Interactive Connectivity Establishment">ICE</abbr> candidates through the signaling server

> ICE stands for Interactive Connectivity Establishment , its a techniques used in NAT( network address translator ) for establishing communication for VOIP, peer-peer, instant-messaging, and other kind of interactive media.
> Typically ice candidate provides the information about the ipaddress and port from where the data is going to be exchanged.
