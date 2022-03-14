# @webrtc-remote-control/core

Imagine you could simply control a web page open in a browser (master) from an other page in an other browser (remote), just like you would with a TV and a remote.

webrtc-remote-control lets you do that (based on PeerJS) and handles the disconnections / reconnections.

Check the demos to have a better understanding.

## Installation

```sh
npm install @webrtc-remote-control/core
```

## Usage

This package is the core one. A react implementation is available.

### master

```js
import prepare, { prepareUtils } from "@webrtc-remote-control/core/master";

async function init() {
  const { bindConnection, getPeerId, humanizeError } = prepare(prepareUtils());
  const peer = new Peer(getPeerId());
  peer.on("open", (peerId) => {
    // do something with this master peerId - create some url to open the browser based on it
  });

  const api = await bindConnection(peer);
  api.on("remote.connect", ({ id }) => {
    console.log(`Yay, remote ${id} just connected to master!`);
  });
  api.on("remote.disconnect", ({ id }) => {
    console.log(`Boo, remote ${id} just disconnected from master!`);
  });
  api.on("data", ({ id }, data) => {
    console.log(`Remote ${id} just sent the message`, data);
  });

  // send some data to the remotes
  api.sendAll({ msg: "Hello world to all remotes" });
  // api.sendTo(remoteId, { msg: "Hello world to a specific remote" });
}
```

### remote

```js
import prepare, { prepareUtils } from "@webrtc-remote-control/core/remote";

async function init() {
  const { bindConnection, getPeerId, humanizeError } = prepare(prepareUtils());
  const peer = new Peer(getPeerId());

  // connect to master with `masterPeerId` (passed via QRCode, url, email ...)
  const api = await bindConnection(peer, masterPeerId);
  api.on("remote.disconnect", ({ id }) => {
    console.log(`Boo, remote ${id} just disconnected from master!`);
  });
  api.on("remote.reconnect", ({ id }) => {
    console.log(`Yay, remote ${id} just reconnected to master!`);
  });
  api.on("data", (_, data) => {
    console.log("Master just sent this message", data);
  });

  // send some data
  api.send({ msg: "Hello master page" });
}
```

## TypeScript

TypeScript types are shipped with the package.

## Customize

You can specify `process.env.NODE_ENV` to `production` or `development` (most bundlers will do it automatically) and you'll have debugging tools like warning/logging messages that won't happen in production mode.

## UMD build

Don't want to use a bundler ? You can simply use the UMD (Universal Module Definition) build and drop it with a script tag, you'll have access to a `webrtcRemoteControl` object on the `window`.

- Development build: `packages/core/dist/webrtc-remote-control.umd.dev.js`
- Production build: `packages/core/dist/webrtc-remote-control.umd.prod.js`
