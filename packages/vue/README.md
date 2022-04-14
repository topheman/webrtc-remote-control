# @webrtc-remote-control/vue

Imagine you could simply control a web page opened in a browser (master) from an other page in an other browser (remote), just like you would with a TV and a remote.

webrtc-remote-control lets you do that (based on [PeerJS](https://peerjs.com)) and handles the disconnections / reconnections, providing a simple API.

Check the [demos](https://github.com/topheman/webrtc-remote-control/tree/master/demo#readme) to have a better understanding.

[More infos on topheman/webrtc-remote-control](https://github.com/topheman/webrtc-remote-control#readme).

## Installation

```sh
npm install peerjs @webrtc-remote-control/vue
```

## Usage

This package relies on [@webrtc-remote-control/core](https://github.com/topheman/webrtc-remote-control/tree/master/packages/core#readme) (the implementation in vanillaJS). Other implementations for popular frameworks are available [here](https://github.com/topheman/webrtc-remote-control/tree/master/packages).

## Example code

Checkout the [source code of the demo in vue](https://github.com/topheman/webrtc-remote-control/tree/master/demo/counter-vue).

## TypeScript

TypeScript types are shipped with the package.

## Customize

You can specify `process.env.NODE_ENV` to `production` or `development` (most bundlers will do it automatically) and you'll have debugging tools like warning/logging messages that won't happen in production mode.

## UMD build

Don't want to use a bundler ? You can simply use the UMD (Universal Module Definition) build and drop it with a script tag, you'll have access to a `webrtcRemoteControlVue` object on the `window`.

- Development build: `packages/vue/dist/webrtc-remote-control-vue.umd.dev.js`
- Production build: `packages/vue/dist/webrtc-remote-control-vue.umd.prod.js`
