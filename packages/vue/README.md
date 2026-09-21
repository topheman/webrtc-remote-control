# @webrtc-remote-control/vue

[![npm](https://img.shields.io/npm/v/@webrtc-remote-control/vue?color=blue)](https://www.npmjs.com/package/@webrtc-remote-control/vue)
[![ci](https://github.com/topheman/webrtc-remote-control/actions/workflows/ci.yml/badge.svg)](https://github.com/topheman/webrtc-remote-control/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-online-blue.svg)](http://webrtc-remote-control.vercel.app/)

Imagine you could simply control a web page opened in a browser (master) from an other page in an other browser (remote), just like you would with a TV and a remote.

webrtc-remote-control lets you do that (based on [PeerJS](https://peerjs.com)) and handles the disconnections / reconnections, providing a simple API.

## Installation

```sh
npm install peerjs @webrtc-remote-control/vue
```

This package relies on [@webrtc-remote-control/core](https://github.com/topheman/webrtc-remote-control/tree/master/packages/core#readme) (the implementation in vanillaJS). Other implementations for popular frameworks are available [here](https://github.com/topheman/webrtc-remote-control/tree/master/packages).

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

Direct link to the [demo](https://webrtc-remote-control.vercel.app/counter-vue/index.html) source code: [App.vue](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-vue/js/App.vue) / [Master.vue](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-vue/js/Master.vue) / [Remote.vue](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-vue/js/Remote.vue)

## Building with an LLM

[`demo/counter-vue/llm.md`](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-vue/llm.md)
is a guide written for coding assistants. It states the parts of the contract the types cannot:
that the mode comes from the URL hash, what `sessionStorageKey` buys you on reload, how `state`
narrows `api` and `peer`, and which responsibilities sit with this package rather than with your
application. Paste it into your assistant's context, or point the assistant at the URL.

## Reconnection

A remote that loses its master retries on a backoff and emits `remote.reconnecting`
before each attempt, then `remote.reconnect` once it is back. `useRemote` hands out
a `reconnectNotice` that turns that payload into something to show:

```js
const { reconnectNotice } = useRemote();

api.on("remote.reconnecting", (payload) => {
  errors.value = [reconnectNotice(payload)];
});
api.on("remote.reconnect", () => {
  errors.value = null;
});
```

The wording is overridable on `provideRemote`, and either half may be a value or
a function of the payload:

```js
provideRemote((utils) => new Peer(utils.getPeerId()), {
  masterPeerId,
  reconnectNotice: {
    reconnecting: ({ attempt }) => `Reconnecting (attempt ${attempt})...`,
    stalled: "The other screen seems gone. Try reloading.",
  },
});
```

A notice does not have to be a string, and core types each half of it
independently. TypeScript infers those types from what you pass to
`provideRemote`, but the injection key is created once, at module scope, so it
cannot carry that inference to the composable. Name it there instead:

```ts
const { reconnectNotice } = useRemote<VNode>();
```

`useRemote` hands out one more thing for the same outage: `isIgnorableError`,
which tells the `peer-unavailable` errors the retry loop provokes from the ones
worth showing. Your subscription to your own peer is untouched - the predicate
answers a question, and you still write the `return`:

```js
const { humanizeError, isIgnorableError } = useRemote();

peer.on("error", (error) => {
  if (isIgnorableError(error)) {
    return;
  }
  errors.value = [humanizeError(error)];
});
```

`useMaster` has no counterpart for either of these: reconnecting is something a
remote does to its master, not the other way round.

See [the core README](https://github.com/topheman/webrtc-remote-control/tree/master/packages/core#telling-the-user-about-a-reconnection)
for what the notice decides, and
[the section after it](https://github.com/topheman/webrtc-remote-control/tree/master/packages/core#skipping-the-errors-the-retry-loop-provokes)
for what the predicate does and does not claim.

## TypeScript

TypeScript types are shipped with the package.

## Module format

The package ships as ES modules only. There is no CommonJS or UMD build, so it
needs a bundler or a browser that loads `<script type="module">`.
