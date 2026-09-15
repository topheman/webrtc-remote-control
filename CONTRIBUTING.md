# Contributing

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://www.conventionalcommits.org)

## Prerequisites

- Nodejs >=24 (see [.nvmrc](.nvmrc))
- pnpm >=12 - `corepack enable pnpm` picks up the version pinned in `packageManager`

## Setup

This project is organized as a monorepo, with [pnpm workspaces](https://pnpm.io/workspaces). The
following installs dependencies for every workspace package and links them together.

```sh
pnpm install
```

## Commonly used scripts

- `pnpm run build`: builds all the packages + demo (you can use some more specific scripts)
  - `pnpm run build:peer-server`: same, preparing for using a local signaling server
- `pnpm run dev`: build the packages + demo in watch mode and dev mode (you can use some more specific scripts)
  - `pnpm run dev:peer-server`: same, using a local signaling server
- `pnpm run preview`: launch the built version
  - `pnpm run preview:peer-server`: same using a local signaling server
- `pnpm run lint`: runs linter
- `pnpm test`: runs unit tests (you can use some more specific scripts)
- `pnpm run test:e2e`: run end-to-end test (you need to have your preview or dev server started)
  - `pnpm run test:e2e:watch`: same in watch mode
- `pnpm run test:e2e:start-server-and-test`: launches preview server and runs e2e tests (you need to have built the project before)
  - `pnpm run test:e2e:start-server-and-test:peer-server`: same using a local signaling server

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
| Environment       | leave empty             |

Until that is configured, the publish job will fail to authenticate. Versioning and the release pull
request work regardless.

## Environment variables

You can pass environment variables at build time **before publish** via tsdown, which backs `vp pack` - [see docs](https://tsdown.dev/options/define).

Nothing in the repo relies on this today. It used to produce the production (minified) and development (unminified) UMD builds, which the packages no longer ship.

## https

WebRTC (and other APIs like the accelerometer) only work on secure origins (localhost is considered secure). The app will work in development if you test it on `localhost` (which is considered secure by browsers), on multiple tabs.

However, if you try to access the app from your local ip (like 192.168.1.1) from your laptop or your mobile, it won't work, since the domain will be recognized as unsecure.

So to test on multiple devices, you'll need to tunnel the app with a utility like [localhost.run](https://localhost.run/) that will open an ssh tunnel and forward traffic on https.

Some tasks are available:

- `pnpm run dev:forward`: same as `pnpm run dev` with forwarding
- `pnpm run preview:forward`: same as `pnpm run preview` with forwarding (you have to build before)
- `pnpm run demo:forward`: will forward `localhost:3000`

The public https temporary address will be outputted on your terminal (keep in mind you won't access your website through your local network but through the internet, which can take longer - use that only to test WebRTC on mobile devices).

## e2e tests

In the [demo](demo#readme), you'll find a version of the counter app for each implementation of webrtc-remote-control (vanilla, react, vue). The UI relies on the same web-components.

The exact same [test suite](demo/__integration__/) runs on each counter app. If you want to contribute and add support for your framework of choice:

- add the implementation of webrtc-remote-control for your framework
- make a counter app (using the existing web-components)
- ensure the tests pass

## PeerJS

[PeerJS](https://peerjs.com/) is a wrapper around the WebRTC browser's APIs. It provides a signaling server for free (which means you don't have to setup any backend server).

Thanks to PeerJS, you don't have to bother directly about:

- the **signaling server** - you already have one for free which relies on websocket
- issue and exchange **offers** and **answers** (<abbr title="Session Description Protocol format">SDP</abbr> session description)
- exchange <abbr title="Interactive Connectivity Establishment">ICE</abbr> candidates through the signaling server

> ICE stands for Interactive Connectivity Establishment , its a techniques used in NAT( network address translator ) for establishing communication for VOIP, peer-peer, instant-messaging, and other kind of interactive media.
> Typically ice candidate provides the information about the ipaddress and port from where the data is going to be exchanged.
