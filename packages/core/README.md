# @webrtc-remote-control/core

## Usage

### With a bundler

```js
import { remote } from "@webrtc-remote-control/core";
```

```js
import remote from "@webrtc-remote-control/core/remote";
```

You can specify `process.env.NODE_ENV` to `production` or `development` (most bundlers will do it automatically) and you'll have debugging tools like warning/logging messages that won't happen in production mode.

### UMD build

Don't want to use a bundler ? You can simply use the UMD (Universal Module Definition) build and drop it with a script tag, you'll have access to an `webrtcRemoteControl` object on the `window`.

- Development build: `packages/core/dist/webrtc-remote-control.umd.dev.js`
- Production build: `packages/core/dist/webrtc-remote-control.umd.prod.js`
