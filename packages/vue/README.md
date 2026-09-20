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

## Reconnection

A remote that loses its master retries on a backoff and emits `remote.reconnecting`
before each attempt, then `remote.reconnect` once it is back. To turn that payload
into something to show, build the notice from core directly - this package does not
accept or hand out a `reconnectNotice` of its own yet:

```js
import { makeReconnectNotice } from "@webrtc-remote-control/core";

const reconnectNotice = makeReconnectNotice();
```

See [the core README](https://github.com/topheman/webrtc-remote-control/tree/master/packages/core#telling-the-user-about-a-reconnection)
for what it decides, how to override the wording, and the `peer-unavailable`
errors worth skipping while a reconnection is in flight.

## TypeScript

TypeScript types are shipped with the package.

## Module format

The package ships as ES modules only. There is no CommonJS or UMD build, so it
needs a bundler or a browser that loads `<script type="module">`.
