# Building a Counter with @webrtc-remote-control/react

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
Root
├── MasterProvider
│   └── Master (displays QR code & counter)
└── RemoteProvider
    └── Remote (shows + and - buttons)
```

A page is one side or the other, never both, so it renders one of the two
providers - which is also how the library knows which side it is on.

## Prerequisites

The library is a wrapper for [PeerJS](https://peerjs.com/). Install it alongside
the binding - it is a peer dependency, not something this package bundles:

```sh
npm install peerjs @webrtc-remote-control/react
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

You should determine which side you are on from the URL, and render the matching
provider:

- `MasterProvider`: When accessing the page directly
- `RemoteProvider`: When the URL contains a hash (the master's peer ID)

For example:

- `https://your-app.com` → `MasterProvider`
- `https://your-app.com#abc123` → `RemoteProvider`, dialing `abc123`

## Getting Started

The library handles the WebRTC connections. What is left to you:

1. Wrap your application with `MasterProvider` or `RemoteProvider`
2. Implement Master and Remote components
3. Use `useMaster` or `useRemote` for WebRTC communication

## Implementation Guide

### 1. Root Component Setup

You should initialize the WebRTC context like this:

```tsx
import type { GetPeerIdType } from "@webrtc-remote-control/core";

// `Peer` is the widened one from Prerequisites, not peerjs's own export
const init = ({ getPeerId }: { getPeerId: GetPeerIdType }) =>
  new Peer(getPeerId());
const SESSION_STORAGE_KEY = "webrtc-remote-control-peer-id-react";

const masterPeerId = window.location.hash.replace("#", "");

masterPeerId ? (
  <RemoteProvider
    init={init}
    masterPeerId={masterPeerId}
    sessionStorageKey={SESSION_STORAGE_KEY}
  >
    <Remote />
  </RemoteProvider>
) : (
  <MasterProvider init={init} sessionStorageKey={SESSION_STORAGE_KEY}>
    <Master />
  </MasterProvider>
);
```

What those props carry:

- Choosing the provider is how you choose the side - see
  [Mode Configuration](#mode-configuration) above. There is no `mode` prop to keep
  in step with anything.
- `masterPeerId` is the id a remote dials. It is required by `RemoteProvider` and
  does not exist on `MasterProvider`, so the two illegal combinations are not
  writable.
- `init` returns the PeerJS peer. Both providers hand it their own utilities, so
  the same callback works for both as long as it only reads what they share.
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

```tsx
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

### 2. Master Component Implementation

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
is what makes the scanning device render `RemoteProvider`.

Build it from `window.location`, never from a hardcoded host, so the same page
works on localhost, on a LAN address, and behind a tunnel such as ngrok:

```tsx
function makeRemoteUrl(masterPeerId: string) {
  return `${window.location.origin}${window.location.pathname}#${masterPeerId}`;
}
```

Give the user a plain link to the same URL next to the code. A second tab on the
laptop is how you try the whole thing without reaching for a phone.

Here's a minimal Master component:

```tsx
interface RemoteCounter {
  id: string;
  counter: number;
}

function Master() {
  // which provider is above you is what types `api`, so nothing is asserted
  const { ready, api, peer } = useMaster();
  const [remotesList, setRemotesList] = useState<RemoteCounter[]>([]);

  useEffect(() => {
    // `ready` is the discriminant of the union the hook returns, so this
    // branch is what makes `api` and `peer` known to be there
    if (ready) {
      // Handle remote connections
      api.on("remote.connect", ({ id }) => {
        setRemotesList((prev) => [...prev, { id, counter: 0 }]);
      });

      // Handle remote disconnections
      api.on("remote.disconnect", ({ id }) => {
        setRemotesList((prev) => prev.filter((remote) => remote.id !== id));
      });

      // Handle incoming counter commands. `data` is whatever the remote sent,
      // so it arrives as `unknown` and you narrow it yourself.
      api.on("data", ({ id }, data) => {
        if ((data as { type?: string }).type === "COUNTER_INCREMENT") {
          setRemotesList((prev) =>
            prev.map((remote) =>
              remote.id === id
                ? { ...remote, counter: remote.counter + 1 }
                : remote,
            ),
          );
        }
      });
    }
  }, [ready]);

  return (
    <div>
      <h1>Master Counter</h1>
      {/* the URL of the remote page, not the bare id - see above */}
      {ready && <QRCode value={makeRemoteUrl(peer.id)} />}
      {ready && <a href={makeRemoteUrl(peer.id)}>open a remote</a>}

      <h2>Connected Remotes ({remotesList.length})</h2>
      <ul>
        {remotesList.map((remote) => (
          <li key={remote.id}>
            Remote {remote.id}: {remote.counter}
          </li>
        ))}
      </ul>

      <h2>
        Total: {remotesList.reduce((sum, remote) => sum + remote.counter, 0)}
      </h2>
    </div>
  );
}
```

### 3. Remote Component Implementation

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

```tsx
function Remote() {
  const { ready, api } = useRemote();

  const increment = () => {
    if (ready) {
      api.send({ type: "COUNTER_INCREMENT" });
    }
  };

  return (
    <div>
      <h1>Remote Control</h1>
      <button onClick={increment}>+</button>
    </div>
  );
}
```

#### Telling the user about a reconnection

A remote that loses its master retries on a backoff - 1s, 2s, 4s, then 8s
repeatedly - and emits `remote.reconnecting` before each attempt, then
`remote.reconnect` once it is back. `useRemote` gives you `humanizeError` for
errors and `reconnectNotice` for these - the wording is yours, the "is it still
worth waiting" threshold is core's.

```tsx
function Remote() {
  const { ready, api, peer, humanizeError, reconnectNotice } = useRemote();
  const [errors, setErrors] = useState<string[] | null>(null);
  // a ref, not state: `onPeerError` below closes over it from another effect
  const reconnecting = useRef(false);

  useEffect(() => {
    if (ready) {
      api.on("remote.reconnecting", (payload) => {
        reconnecting.current = true;
        setErrors([reconnectNotice(payload)]);
      });
      api.on("remote.reconnect", () => {
        reconnecting.current = false;
        setErrors(null);
      });
    }
  }, [ready]);
}
```

Two things are easy to get wrong here.

`remote.reconnect` has to undo everything the disconnection did - clear the
errors, restore the peer id, re-send whatever state the master needs. A remote
that came back but still shows an error is indistinguishable from one that
never did.

And while the retry loop runs, peerjs emits `peer-unavailable` errors for the
attempts that lose their race to the master re-registering. Passing those to
`humanizeError` talks over the notice with advice to reload - the one thing the
user does not need to do - so skip them while a reconnection is in flight:

```tsx
const onPeerError = (error: Error) => {
  if (
    reconnecting.current &&
    (error as { type?: string }).type === "peer-unavailable"
  ) {
    return;
  }
  setErrors([humanizeError(error)]);
};
```

Register that one on `peer`, not on `api`, in an effect keyed on `peer`.

Both messages are overridable, on the provider, and either may be a value or a
function of the payload - `{ id, attempt, nextDelayMs }`:

```tsx
<RemoteProvider
  masterPeerId={masterPeerId}
  init={({ getPeerId }) => new Peer(getPeerId())}
  reconnectNotice={{
    reconnecting: ({ attempt }) => `Reconnecting (attempt ${attempt})...`,
    stalled: "The other screen seems gone. Try reloading.",
  }}
>
```

They are independently typed and inferred from what you pass there. A React
context is created once, at module scope, so it cannot carry that inference to
the hook: if your notice is not a string, name its type at `useRemote` instead -
`useRemote<ReactNode>()`. `useMaster` has no counterpart, since reconnecting is
something a remote does to its master, not the other way round.

## Best Practices

You should:

- Use `useMaster` or `useRemote` for all WebRTC operations
- Implement proper error handling, using the `humanizeError` function
- Clean up connections in useEffect
- Make sure your application correctly behaves in reconnection scenarios - see
  [Telling the user about a reconnection](#telling-the-user-about-a-reconnection)

## Technical Requirements

The library:

- Handles WebRTC signaling through PeerJS
- Manages real-time bidirectional communication
- Maintains persistent connections
- Handles connection errors
- Handles reconnection scenarios
- Provides React hooks for state management
