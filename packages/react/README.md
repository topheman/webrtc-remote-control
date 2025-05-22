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
<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
```

Direct link to the [demo](https://webrtc-remote-control.vercel.app/counter-react/index.html) source code: [App.jsx](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/App.jsx) / [Master.jsx](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/Master.jsx) / [Remote.jsx](https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/Remote.jsx)

## TypeScript

TypeScript types are shipped with the package.

## UMD build

Don't want to use a bundler ? You can simply use the UMD (Universal Module Definition) build and drop it with a script tag, you'll have access to a `webrtcRemoteControlReact` object on the `window`.

- Development build: [https://unpkg.com/@webrtc-remote-control/react/dist/webrtc-remote-control-react.umd.dev.js](https://unpkg.com/@webrtc-remote-control/react/dist/webrtc-remote-control-react.umd.dev.js)
- Production build: [https://unpkg.com/@webrtc-remote-control/react/dist/webrtc-remote-control-react.umd.prod.js](https://unpkg.com/@webrtc-remote-control/react/dist/webrtc-remote-control-react.umd.prod.js)
