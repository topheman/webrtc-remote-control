# @webrtc-remote-control/react

[![npm](https://img.shields.io/npm/v/@webrtc-remote-control/react?color=blue)](https://www.npmjs.com/package/@webrtc-remote-control/react)
[![ci](https://github.com/topheman/webrtc-remote-control/actions/workflows/ci.yml/badge.svg)](https://github.com/topheman/webrtc-remote-control/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-online-blue.svg)](http://webrtc-remote-control.vercel.app/)

Imagine you could simply control a web page opened in a browser (master) from an other page in an other browser (remote), just like you would with a TV and a remote.

webrtc-remote-control lets you do that (based on [PeerJS](https://peerjs.com)) and handles the disconnections / reconnections, providing a simple API.

## Installation

```sh
npm install peerjs @webrtc-remote-control/react
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

Direct link to the [demo](https://webrtc-remote-control.vercel.app/counter-react/index.html) source code: [App.tsx](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/App.tsx) / [Master.tsx](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/Master.tsx) / [Remote.tsx](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/Remote.tsx)

## Building with an LLM

[`demo/counter-react/llm.md`](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/llm.md)
is a guide written for coding assistants. It states the parts of the contract the types cannot:
that the mode comes from the URL hash, what `sessionStorageKey` buys you on reload, and which
responsibilities sit with this package rather than with your application. Paste it into your
assistant's context, or point the assistant at the URL.

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
