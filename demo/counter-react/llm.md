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

The library is a wrapper for [PeerJS](https://peerjs.com/), you will need to include the PeerJS library in your project.

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
const init = ({ getPeerId }) => new Peer(getPeerId());
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
const init = ({ getPeerId }) =>
  new Peer(getPeerId(), {
    // your own signaling server, rather than the public one
    host: "localhost",
    port: 9000,
    path: "/myapp",
    config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
  });
```

Two things are worth knowing before you copy PeerJS's defaults. Its default
`iceServers` pairs that STUN server with two TURN hosts that no longer resolve,
so every connection attempt logs an ICE failure for them - listing only the STUN
entry is quieter and connects just as well on a local network. And its default
host, `0.peerjs.com`, hangs indefinitely on some mobile carriers
([peers/peerjs#948](https://github.com/peers/peerjs/issues/948#issuecomment-1107437915)),
which is a real risk for this library specifically: the remote side is usually a
phone.

### 2. Master Component Implementation

The library provides:

- WebRTC connection management
- Peer discovery and connection
- Real-time data transmission
- Connection state handling
- QR code generation for peer ID

You should implement:

- Counter state management (increment/decrement logic)
- Display of current counter value
- List of connected remotes and their individual counters
- UI for the master view
- Error handling specific to counter operations

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
      {peer && <QRCode value={peer.id} />}

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

## Best Practices

You should:

- Use `useMaster` or `useRemote` for all WebRTC operations
- Implement proper error handling, using the `humanizeError` function
- Clean up connections in useEffect
- Make sure your application correctly behaves in reconnection scenarios

## Technical Requirements

The library:

- Handles WebRTC signaling through PeerJS
- Manages real-time bidirectional communication
- Maintains persistent connections
- Handles connection errors
- Handles reconnection scenarios
- Provides React hooks for state management
