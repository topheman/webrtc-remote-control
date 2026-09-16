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

Add the peerjs library as a script tag in your html page. You'll have access to `Peer` constructor.

```html
<script src="https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js"></script>
```

Direct link to the [demo](https://webrtc-remote-control.vercel.app/counter-react/index.html) source code: [App.tsx](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/App.tsx) / [Master.tsx](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/Master.tsx) / [Remote.tsx](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/Remote.tsx)

## Building with an LLM

[`demo/counter-react/llm.md`](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/llm.md)
is a guide written for coding assistants. It states the parts of the contract the types cannot:
that the mode comes from the URL hash, what `sessionStorageKey` buys you on reload, and which
responsibilities sit with this package rather than with your application. Paste it into your
assistant's context, or point the assistant at the URL.

## TypeScript

TypeScript types are shipped with the package.

## Module format

The package ships as ES modules only. There is no CommonJS or UMD build, so it
needs a bundler or a browser that loads `<script type="module">`.
