# Contributing

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://www.conventionalcommits.org)

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

## https

WebRTC (and other APIs like the accelerometer) only work on secure origins (localhost is considered secure). The app will work in development if you test it on `localhost` (which is considered secure by browsers), on multiple tabs.

However, if you try to access the app from your local ip (like 192.168.1.1) from your laptop or your mobile, it won't work, since the domain will be recognized as unsecure.

So to test on multiple devices, you'll need to tunnel the app with a utility like [localhost.run](https://localhost.run/) that will open an ssh tunnel and forward traffic on https.

Some tasks are available:

- `npm run dev:forward`: same as `npm run dev` with forwarding
- `npm run preview:forward`: same as `npm run preview` with forwarding (you have to build before)
- `npm run demo:forward`: will forward `localhost:3000`

The public https temporary address will be outputted on your terminal (keep in mind you won't access your website through your local network but through the internet, which can take longer - use that only to test WebRTC on mobile devices).

### Optimizations

Doing that means you access your webserver through the internet (not from your local network any more), which will slow down your feedback loop (ctrl+save and see the result) as a developer.

To improve that, on accelerometer-graph:

- `npm run forward` and copy the temp address of your tunnel (like https://b6eeff711b00d5.lhrtunnel.link)
- then run `VITE_FORWARD_DOMAIN=THE_ADDRESS_YOU_JUST_COPIED npm run dev:demo`
- on your laptop, access the master page on http://localhost:3000
  - you will be presented 2 QRCode
  - with your mobile, snap the QRCode which points to lhrtunnel.link

That way you access the website in dev-server mode :

- on your laptop from your local network
- on your mobile from internet (you need https so that WebRTC and accelerometer will work - localhost doesn't exist on the mobile)
- the WebRTC invite is correctly shared
- and the refreses on the master pages are instant (they are done from local network)

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
