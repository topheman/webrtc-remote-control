# @webrtc-remote-control/core

[![npm](https://img.shields.io/npm/v/@webrtc-remote-control/core?color=blue)](https://www.npmjs.com/package/@webrtc-remote-control/core)
[![ci](https://github.com/topheman/webrtc-remote-control/actions/workflows/ci.yml/badge.svg)](https://github.com/topheman/webrtc-remote-control/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-online-blue.svg)](http://webrtc-remote-control.vercel.app/)

Imagine you could simply control a web page opened in a browser (master) from an other page in an other browser (remote), just like you would with a TV and a remote.

webrtc-remote-control lets you do that (based on [PeerJS](https://peerjs.com)) and handles the disconnections / reconnections, providing a simple API.

Check the [demos](https://github.com/topheman/webrtc-remote-control/tree/master/demo#readme) to have a better understanding.

[More infos on topheman/webrtc-remote-control](https://github.com/topheman/webrtc-remote-control#readme).

## Installation

```sh
npm install peerjs @webrtc-remote-control/core
```

## Usage

This package is the core one. Implementations for popular frameworks such as react or vue are available [here](https://github.com/topheman/webrtc-remote-control/tree/master/packages).

## Example code

More examples in [demo](https://github.com/topheman/webrtc-remote-control/tree/master/demo).

Add the peerjs library as a script tag in your html page. You'll have access to `Peer` constructor.

```html
<script src="https://unpkg.com/peerjs@1.3.2/dist/peerjs.min.js"></script>
```

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

## UMD build

Don't want to use a bundler ? You can simply use the UMD (Universal Module Definition) build and drop it with a script tag from your favorite js cdn, you'll have access to a `webrtcRemoteControl` object on the `window`.

- Development build: [https://unpkg.com/@webrtc-remote-control/core/dist/webrtc-remote-control.umd.dev.js](https://unpkg.com/@webrtc-remote-control/core/dist/webrtc-remote-control.umd.dev.js)
- Production build: [https://unpkg.com/@webrtc-remote-control/core/dist/webrtc-remote-control.umd.prod.js](https://unpkg.com/@webrtc-remote-control/core/dist/webrtc-remote-control.umd.prod.js)
