# @webrtc-remote-control/core

[![npm](https://img.shields.io/npm/v/@webrtc-remote-control/core?color=blue)](https://www.npmjs.com/package/@webrtc-remote-control/core)
[![ci](https://github.com/topheman/webrtc-remote-control/actions/workflows/ci.yml/badge.svg)](https://github.com/topheman/webrtc-remote-control/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-online-blue.svg)](http://webrtc-remote-control.vercel.app/)

Imagine you could simply control a web page opened in a browser (master) from an other page in an other browser (remote), just like you would with a TV and a remote.

webrtc-remote-control lets you do that (based on [PeerJS](https://peerjs.com)) and handles the disconnections / reconnections, providing a simple API.

## Installation

```sh
npm install peerjs @webrtc-remote-control/core
```

This package is the core one. Implementations for popular frameworks such as react or vue are available [here](https://github.com/topheman/webrtc-remote-control/tree/master/packages).

## Usage

peerjs is a peer dependency, so install it alongside this package and import it:

```js
import { Peer } from "peerjs";
```

<details>
<summary>In TypeScript, <code>new Peer(getPeerId())</code> needs one cast</summary>

`getPeerId()` returns `string | undefined` - `undefined` on a first visit, which
peerjs reads as "allocate me an id from the brokering server". Its declarations do
not describe that: it declares `()`, `(options)` and `(id: string, options?)`, and
none of them admits an absent id alongside options. The gap is in the types only,
so fix it in the types - declare the missing overload once, rather than branching
at runtime or asserting at every call site:

```ts
import { Peer as PeerJs } from "peerjs";
import type { PeerOptions } from "peerjs";

export const Peer = PeerJs as typeof PeerJs & {
  new (id: string | undefined, options?: PeerOptions): PeerJs;
};
```

The examples below assume that `Peer`.

</details>

Direct link to the [demo](https://webrtc-remote-control.vercel.app/counter-vanilla/master.html) source code: [master.ts](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-vanilla/js/master.ts) / [remote.ts](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-vanilla/js/remote.ts)

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

### Messages sent before you listen

On both the master and the remote, `data` received before the first
`api.on("data", ...)` is not lost: it is queued and delivered to that first
listener, in order, at most 100 messages (the oldest are dropped past that).
Every listener added in the same synchronous run gets them; one added later, or
after all listeners were removed, does not.

Only `data` is queued. A master that subscribes late can receive `data` from a
remote whose `remote.connect` it never saw, so do not assume every `id` is
already known.

### Telling the user about a reconnection

A remote that loses its master retries on a backoff - 1s, 2s, 4s, then 8s
repeatedly - and emits `remote.reconnecting` before each attempt, then
`remote.reconnect` once it is back. The payload carries `id`, the `attempt`
number, and `nextDelayMs`, the wait before the next try.

A first connection that stalls is retried on the same backoff, silently, since
`bindConnection` has not resolved yet. A `peer-unavailable` ends those retries:
the master id is wrong or the master is gone.

Deciding what to tell the user means knowing when "reconnecting" stops being a
plausible thing to say, and that means comparing `nextDelayMs` against the
backoff ceiling. That comparison is the library's job, so `prepareUtils` hands
out a `reconnectNotice` that makes it for you:

```js
import prepare, { prepareUtils } from "@webrtc-remote-control/core/remote";

const utils = prepareUtils();
const { bindConnection, getPeerId, humanizeError, reconnectNotice } =
  prepare(utils);

const api = await bindConnection(new Peer(getPeerId()), masterPeerId);

api.on("remote.reconnecting", (payload) => {
  setStatus(reconnectNotice(payload));
});
api.on("remote.reconnect", () => {
  setStatus(null);
});
```

Both messages are overridable, and either may be a value or a function of the
payload:

```js
const utils = prepareUtils({
  reconnectNotice: {
    reconnecting: ({ attempt }) => `Reconnecting (attempt ${attempt})...`,
    stalled: "The other screen seems gone. Try reloading.",
  },
});
```

Only the remote side is handed one - the `prepare` exported from
`@webrtc-remote-control/core/master` has no `reconnectNotice`, because a master
does not "reconnect", the remotes reconnect to their master. The react and vue
bindings take the same option and hand the notice out of `useRemote`; see their
READMEs for the one thing that differs there, which is that a context cannot
carry the inference described below.

`makeReconnectNotice` is the same factory on its own, for when you are not
building the rest of the utilities:

```js
import { makeReconnectNotice } from "@webrtc-remote-control/core";

const reconnectNotice = makeReconnectNotice();
```

Its two messages are independently typed and inferred from what you pass, so
returning something richer than a string - a React node, say - needs no
annotation and no cast.

### Skipping the errors the retry loop provokes

While the retry loop runs, peerjs emits `peer-unavailable` for every attempt
that loses its race to the master re-registering its stored id. Passing those
through `humanizeError` talks over the notice with advice to reload - the one
thing the user should not do mid-recovery. Rewording the message is not a fix
either: on a first connection, where `peer-unavailable` means the master id is wrong or gone and stops any retry, that advice is correct.

What separates the two cases is whether the retry loop is running, and that is
state only this library holds. `isIgnorableError` answers it, so you do not have
to track it yourself:

```js
const peer = new Peer(getPeerId());
const { bindConnection, humanizeError, isIgnorableError } = prepare(utils);

peer.on("error", (error) => {
  // your own logging still sees every error
  console.error(error);
  if (isIgnorableError(error)) {
    return;
  }
  setErrors([humanizeError(error)]);
});
```

Nothing is intercepted. You subscribe to your own `Peer` exactly as before and
receive every event it emits; the predicate only answers a question, and you
still write the `return`. It answers `true` only while a reconnection is in
flight, and only for `peer-unavailable` and `unavailable-id` - the second when
the signaling server still holds the remote's id from before the outage. No
other error type is ever this library's doing. What it cannot do is tell which peer an error is about, since
peerjs carries that id only inside the message text, so a page whose `Peer` also
connects to ids this library does not manage should not call it.

Like `reconnectNotice`, it is handed out by the remote side alone.

### Retrying an id the signaling server still holds

A page that reloads under the id `getPeerId` kept for it can reach the
signaling server before the old page's socket is gone. The server then refuses
the id with `unavailable-id`, and peerjs destroys a `Peer` that has never
opened, so `bindConnection` waits for an `open` that never comes. Recovering
means building another `Peer`. The react and vue providers do it for you; with
core alone, the pieces are exported:

```js
import {
  ID_TAKEN_MAX_ATTEMPTS,
  onIdTakenBeforeOpen,
  reconnectDelay,
} from "@webrtc-remote-control/core";

let attempt = 0;
function start() {
  // After five refusals, take a fresh id - on a master, only while someone can
  // see its new link.
  const fresh =
    attempt >= ID_TAKEN_MAX_ATTEMPTS && document.visibilityState === "visible";
  const peer = new Peer(fresh ? undefined : getPeerId());
  // No other socket can hold a fresh id, so it is tried once.
  if (!fresh) {
    const stop = onIdTakenBeforeOpen(peer, () => {
      stop();
      setTimeout(start, reconnectDelay(attempt));
      attempt += 1;
    });
  }
  bindConnection(peer /* , masterPeerId on the remote side */);
}
start();
```

The listener only fires before the peer's first `open`: afterwards peerjs
merely disconnects on `unavailable-id`, the remote's reconnection loop already
handles that, and `isIgnorableError` says so. A master that ends up on a fresh id is no longer the one
its remotes were pointed at, so they need its new link.

## TypeScript

TypeScript types are shipped with the package.

## Module format

The package ships as ES modules only. There is no CommonJS or UMD build, so it
needs a bundler or a browser that loads `<script type="module">`.
