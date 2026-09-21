# Building a Counter with @webrtc-remote-control/vue

## Application Behavior

This application creates a real-time counter that can be controlled remotely:

1. **Master Device (e.g., Laptop)**
   - Displays a QR code on the screen
   - Shows the current counter value
   - Updates in real-time when remote devices interact
   - Can display multiple connected remote devices and their counter values

2. **Remote Device (e.g., Smartphone)**
   - User scans the QR code from the master device
   - Opens a simple interface with + and - buttons
   - Each button press instantly updates the counter on the master device
   - Connection status is clearly displayed

The library handles the WebRTC communication, so the counter updates in real time across devices. It survives a page reload too: a peer that comes back reconnects under the same id rather than joining as a new one.

## Application Structure

```
App (calls provideMaster or provideRemote)
├── Master.vue (displays QR code & counter)
└── Remote.vue (shows + and - buttons)
```

A page is one side or the other, never both. The root component calls one of the
two provide functions, and the child component calls the matching composable.
Which one you call is how the library knows which side it is on.

## Prerequisites

The library is a wrapper for [PeerJS](https://peerjs.com/). Install it alongside
the binding - it is a peer dependency, not something this package bundles:

```sh
npm install peerjs @webrtc-remote-control/vue
```

Import `Peer` as a module. Do not reach for a `<script>` tag: older versions of
these docs told you to, because peerjs did not bundle cleanly years ago, and
that is no longer true.

In TypeScript, one cast is needed and it is worth understanding rather than
copying. `getPeerId()` returns `string | undefined` - `undefined` on a first
visit, which peerjs reads as "allocate me an id from the brokering server". Its
declarations do not describe that: it declares `()`, `(options)` and
`(id: string, options?)`, and none of them admits an absent id alongside
options. The gap is in the types only, so close it in the types - declare the
missing overload once, rather than branching at runtime or asserting at every
call site:

```ts
import { Peer as PeerJs } from "peerjs";
import type { PeerOptions } from "peerjs";

export const Peer = PeerJs as typeof PeerJs & {
  new (id: string | undefined, options?: PeerOptions): PeerJs;
};
```

Every example below assumes that `Peer`.

## Mode Configuration

You should determine which side you are on from the URL, and call the matching
provide function:

- `provideMaster`: When accessing the page directly
- `provideRemote`: When the URL contains a hash (the master's peer ID)

For example:

- `https://your-app.com` → `provideMaster`
- `https://your-app.com#abc123` → `provideRemote`, dialing `abc123`

## Getting Started

The library handles the WebRTC connections. What is left to you:

1. Call `provideMaster` or `provideRemote` in your root component's `setup`
2. Implement Master and Remote components
3. Use `useMaster` or `useRemote` for WebRTC communication

## Implementation Guide

### 1. Root Component Setup

You should initialize the WebRTC context like this:

```vue
<template>
  <div>
    <Master v-if="mode === 'master'" key="master" />
    <Remote v-if="mode === 'remote'" key="remote" />
  </div>
</template>

<script setup lang="ts">
import { provideMaster, provideRemote } from "@webrtc-remote-control/vue";
import type { GetPeerIdType } from "@webrtc-remote-control/core";

import Master from "./Master.vue";
import Remote from "./Remote.vue";

const SESSION_STORAGE_KEY = "webrtc-remote-control-peer-id-vue";

// `Peer` is the widened one from Prerequisites, not peerjs's own export
const init = ({ getPeerId }: { getPeerId: GetPeerIdType }) =>
  new Peer(getPeerId());

const mode = window.location.hash ? "remote" : "master";

if (mode === "remote") {
  provideRemote(init, {
    masterPeerId: window.location.hash.replace("#", ""),
    sessionStorageKey: SESSION_STORAGE_KEY,
  });
} else {
  provideMaster(init, { sessionStorageKey: SESSION_STORAGE_KEY });
}
</script>
```

Two things about that placement. `provide` has to run while `setup` is on the
stack, so this cannot move into `onBeforeMount` - and there is nothing to wait
for anyway, the hash is readable straight away. And the branch is written once,
here: picking the provide function picks the mode, so nothing downstream has to
be told which one it is.

What the arguments carry:

- Choosing the function is how you choose the side - see
  [Mode Configuration](#mode-configuration) above. There is no `mode` option to
  keep in step with anything.
- `masterPeerId` is the id a remote dials. It is required by `provideRemote` and
  does not exist on `provideMaster`, so the two illegal combinations are not
  writable.
- `init` returns the PeerJS peer. Both sides hand it their own utilities, so the
  same callback works for both as long as it only reads what they share.
  `getPeerId()` gives you the id kept in session storage, or `undefined` the
  first time round - PeerJS reads that as "allocate me one".
- `sessionStorageKey` is what makes reconnection after a reload work. The peer id is stored
  under it, so a reloaded page asks PeerJS for the same id instead of being handed a new one.
  Give each mode of your app its own key, or two pages open side by side will fight over one
  id. Session storage is per tab, which is why it is the right place for this.

### 1b. Pointing PeerJS somewhere else (optional)

`new Peer` takes an options object as its second argument, and the library
passes whatever you build straight through - it never looks at it. You only need
this if the public signaling server is not what you want:

```ts
const init = ({ getPeerId }: { getPeerId: GetPeerIdType }) =>
  new Peer(getPeerId(), {
    // your own signaling server, rather than the public one
    host: "localhost",
    port: 9000,
    path: "/myapp",
    config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
  });
```

One thing is worth knowing before you copy PeerJS's defaults: its default
`iceServers` pairs that STUN server with two TURN hosts that no longer resolve,
so every connection attempt logs an ICE failure for them. Listing only the STUN
entry is quieter and connects just as well on a local network.

### 2. Reading the connection: `state`

`useMaster` and `useRemote` both hand out a `state` ref. Its value is a
discriminated union, and `ready` is the discriminant: read it and `api` and
`peer` become known to be there on that same value. Nothing needs an assertion.

```ts
const { state, humanizeError } = useMaster();

watch(state, (current, _, onCleanup) => {
  // one branch for the whole body
  if (!current.ready) {
    return;
  }
  const { api, peer } = current;
  // `api` and `peer` are narrowed here
});
```

`humanizeError` is destructured outside the branch on purpose: it is a plain
function, built with the connection and never replaced, so it is not part of the
ref. Only the part that changes lives in `state`.

Two habits follow from that, and both matter in callbacks that outlive the
`watch` which registered them:

- Destructure `api` and `peer` **inside** the branch, not at the top of the
  component. Destructuring the ref itself gives you a snapshot that will not
  update.
- A callback registered in one `watch` run and invoked later should read
  `state.value` again rather than close over an `api` narrowed back then.

### 3. Master Component Implementation

The library provides:

- WebRTC connection management
- Peer discovery and connection
- Real-time data transmission
- Connection state handling

You should implement:

- Counter state management (increment/decrement logic)
- Display of current counter value
- List of connected remotes and their individual counters
- UI for the master view
- Error handling specific to counter operations
- The QR code, with a library of your choice - see below

#### What the QR code has to encode

The library does not generate QR codes, and `peer.id` on its own is not what you
want in one: a phone that scans it gets a bare string and nothing to open. What
the code has to carry is the **URL of your remote page with that id in the
hash** - the same URL [Mode Configuration](#mode-configuration) describes, which
is what makes the scanning device call `provideRemote`.

Build it from `window.location`, never from a hardcoded host, so the same page
works on localhost, on a LAN address, and behind a tunnel such as ngrok:

```ts
function makeRemoteUrl(masterPeerId: string) {
  return `${window.location.origin}${window.location.pathname}#${masterPeerId}`;
}
```

Give the user a plain link to the same URL next to the code. A second tab on the
laptop is how you try the whole thing without reaching for a phone.

Here's a minimal Master component:

```vue
<template>
  <div>
    <h1>Master Counter</h1>
    <!-- the URL of the remote page, not the bare id - see above -->
    <QRCode v-if="peerId" :value="makeRemoteUrl(peerId)" />
    <a v-if="peerId" :href="makeRemoteUrl(peerId)">open a remote</a>

    <h2>Connected Remotes ({{ remotesList.length }})</h2>
    <ul>
      <li v-for="remote in remotesList" :key="remote.id">
        Remote {{ remote.id }}: {{ remote.counter }}
      </li>
    </ul>

    <h2>Total: {{ total }}</h2>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useMaster } from "@webrtc-remote-control/vue";
import type { WrcMasterEvents } from "@webrtc-remote-control/core/master";

interface RemoteCounter {
  id: string;
  counter: number;
}

const peerId = ref<string | null>(null);
const remotesList = ref<RemoteCounter[]>([]);
const total = computed(() =>
  remotesList.value.reduce((sum, remote) => sum + remote.counter, 0),
);

const { state } = useMaster();

const onRemoteConnect: WrcMasterEvents["remote.connect"] = ({ id }) => {
  remotesList.value = [...remotesList.value, { id, counter: 0 }];
};
const onRemoteDisconnect: WrcMasterEvents["remote.disconnect"] = ({ id }) => {
  remotesList.value = remotesList.value.filter((remote) => remote.id !== id);
};
// `data` is whatever the remote sent, so it arrives as `unknown` and you
// narrow it yourself
const onData: WrcMasterEvents["data"] = ({ id }, data) => {
  if ((data as { type?: string }).type === "COUNTER_INCREMENT") {
    remotesList.value = remotesList.value.map((remote) =>
      remote.id === id ? { ...remote, counter: remote.counter + 1 } : remote,
    );
  }
};

watch(state, (current, _, onCleanup) => {
  if (!current.ready) {
    return;
  }
  const { api, peer } = current;
  peerId.value = peer.id;
  api.on("remote.connect", onRemoteConnect);
  api.on("remote.disconnect", onRemoteDisconnect);
  api.on("data", onData);
  onCleanup(() => {
    api.off("remote.connect", onRemoteConnect);
    api.off("remote.disconnect", onRemoteDisconnect);
    api.off("data", onData);
  });
});
</script>
```

Naming the handlers rather than passing inline arrows is what makes the
`onCleanup` above able to unsubscribe them: `api.off` needs the same reference
`api.on` was given.

### 4. Remote Component Implementation

The library provides:

- WebRTC connection to master
- Real-time data transmission
- Connection state management
- Automatic reconnection handling

You should implement:

- UI with + and - buttons
- Counter command sending logic
- Remote device identification
- Connection status display
- Error handling specific to counter operations
- Reconnection status display - see below

Here's a minimal Remote component:

```vue
<template>
  <div>
    <h1>Remote Control</h1>
    <button @click="increment">+</button>
  </div>
</template>

<script setup lang="ts">
import { useRemote } from "@webrtc-remote-control/vue";

const { state } = useRemote();

const increment = () => {
  // read the ref again here rather than destructuring `api` above: this
  // callback runs long after setup, and `state` may have been `ready: false`
  // back then
  const current = state.value;
  if (current.ready) {
    current.api.send({ type: "COUNTER_INCREMENT" });
  }
};
</script>
```

#### Telling the user about a reconnection

A remote that loses its master retries on a backoff - 1s, 2s, 4s, then 8s
repeatedly - and emits `remote.reconnecting` before each attempt, then
`remote.reconnect` once it is back. `useRemote` gives you `humanizeError` for
errors and `reconnectNotice` for these - the wording is yours, the "is it still
worth waiting" threshold is core's.

```ts
const { state, humanizeError, isIgnorableError, reconnectNotice } = useRemote();
const errors = ref<string[] | null>(null);

// errors come from `peer`, not from `api`, so they get their own watcher -
// and it watches `state.value.peer` rather than `state`, because a peer
// exists before the connection is ready
watch(
  () => state.value.peer,
  (currentPeer, _, onCleanup) => {
    if (currentPeer) {
      currentPeer.on("error", onPeerError);
      onCleanup(() => {
        currentPeer.off("error", onPeerError);
      });
    }
  },
  { immediate: true },
);

watch(state, (current, _, onCleanup) => {
  if (!current.ready) {
    return;
  }
  const { api } = current;
  api.on("remote.reconnecting", onRemoteReconnecting);
  api.on("remote.reconnect", onRemoteReconnect);
  onCleanup(() => {
    api.off("remote.reconnecting", onRemoteReconnecting);
    api.off("remote.reconnect", onRemoteReconnect);
  });
});

const onRemoteReconnecting: WrcRemoteEvents["remote.reconnecting"] = (
  payload,
) => {
  errors.value = [reconnectNotice(payload)];
};
const onRemoteReconnect: WrcRemoteEvents["remote.reconnect"] = () => {
  errors.value = null;
};
const onPeerError = (error: Error) => {
  if (isIgnorableError(error)) {
    return;
  }
  errors.value = [humanizeError(error)];
};
```

Two things are easy to get wrong here.

`remote.reconnect` has to undo everything the disconnection did - clear the
errors, restore the peer id, re-send whatever state the master needs. A remote
that came back but still shows an error is indistinguishable from one that
never did. Its payload carries the id, so that handler is where you put the id
back.

And while the retry loop runs, peerjs emits `peer-unavailable` errors for the
attempts that lose their race to the master re-registering. Passing those to
`humanizeError` talks over the notice with advice to reload - the one thing the
user does not need to do. Do not track that yourself with a flag: the
`isIgnorableError` above is handed out by `useRemote` and knows whether core is
retrying. Nothing is intercepted - every error still reaches your handler, so
log there freely; the predicate only decides what is worth putting on screen. It
says `true` only for `peer-unavailable`, only while a reconnection is in flight.

Both messages are overridable, on `provideRemote`, and either may be a value or
a function of the payload - `{ id, attempt, nextDelayMs }`:

```ts
provideRemote(init, {
  masterPeerId,
  reconnectNotice: {
    reconnecting: ({ attempt }) => `Reconnecting (attempt ${attempt})...`,
    stalled: "The other screen seems gone. Try reloading.",
  },
});
```

They are independently typed and inferred from what you pass there. The
injection key is created once, at module scope, so it cannot carry that
inference to the composable: if your notice is not a string, name its type at
`useRemote` instead - `useRemote<VNode>()`. `useMaster` has no counterpart for
either of these, since reconnecting is something a remote does to its master,
not the other way round.

## Best Practices

You should:

- Use `useMaster` or `useRemote` for all WebRTC operations
- Read `state.value.ready` to narrow, rather than asserting on `api` or `peer`
- Unsubscribe in `onCleanup`, with named handlers so `api.off` gets the same
  reference
- Implement proper error handling, using the `humanizeError` function
- Make sure your application correctly behaves in reconnection scenarios - see
  [Telling the user about a reconnection](#telling-the-user-about-a-reconnection)

## Technical Requirements

The library:

- Handles WebRTC signaling through PeerJS
- Manages real-time bidirectional communication
- Maintains persistent connections
- Handles connection errors
- Handles reconnection scenarios
- Provides Vue composables for state management
