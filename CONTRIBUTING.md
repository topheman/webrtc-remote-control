# Contributing

## Prerequisites

- Nodejs >=16
- npm >=8

## Setup

This project is organized as a monorepo, with lerna. The following will install dependencies for every submodules and wire everything up (via `lerna bootstrap`).

```sh
npm install
```

## Commonly used scripts

- `npm run build`: builds all the packages + demo (you can use some more specific scripts)
  - `npm run build:peer-server`: same, preparing for using a local signaling server
- `npm run dev`: build the packages + demo in watch mode and dev mode (you can use some more specific scripts)
  - `npm run dev:peer-server`: same, using a local signaling server
- `npm run preview`: launch the built version
  - `npm run preview:peer-server`: same using a local signaling server
- `npm run lint`: runs linter
- `npm test`: runs unit tests (you can use some more specific scripts)
- `npm run test:e2e`: run end-to-end test (you need to have your preview or dev server started)
  - `npm run test:e2e:watch`: same in watch mode
- `npm run test:e2e:start-server-and-test`: launches preview server and runs e2e tests (you need to have built the project before)
  - `npm run test:e2e:start-server-and-test:peer-server`: same using a local signaling server

## Using the local peer server

By default, you can use the signaling server of peerjs (no need to deploy your own).

For some reason, you may want to run your code against a local signaling server. You can launch a signaling server with the following command in a tab:

```sh
npm run peer-server
```

Then on an other tab, set the env var `VITE_USE_LOCAL_PEER_SERVER=true`

```sh
VITE_USE_LOCAL_PEER_SERVER=true npm run dev # also works with npm run build
```

## Adding dependencies

If you need to add dependencies to one of the packages or the demo, dont use `npm` directly, use [@lerna/add](https://www.npmjs.com/package/@lerna/add).

Examples:

```sh
npx lerna add npm-run-all --scope=@webrtc-remote-control/react --dev
npx lerna add prop-types --scope=@webrtc-remote-control/react
npx lerna add react@>=16.8.0 --scope=@webrtc-remote-control/react --peer
npx lerna add react vue --scope=@webrtc-remote-control/demo
```

## Environment variables

You can pass environment variables at build time **before publish** via microbundle - [see docs](https://github.com/developit/microbundle#defining-build-time-constants).

This is currently used to create production (minified) and development (unminified) versions of the UMD builds.
