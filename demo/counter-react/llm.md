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
└── WebRTCRemoteControlProvider
    ├── Master (displays QR code & counter)
    └── Remote (shows + and - buttons)
```

## Prerequisites

The library is a wrapper for [PeerJS](https://peerjs.com/), you will need to include the PeerJS library in your project.

## Mode Configuration

You should determine the mode based on the URL:

- `mode="master"`: When accessing the page directly
- `mode="remote"`: When the URL contains a hash (peer ID)

For example:

- `https://your-app.com` → Set `mode="master"`
- `https://your-app.com#abc123` → Set `mode="remote"`

## Getting Started

The library handles the WebRTC connections. What is left to you:

1. Wrap your application with `WebRTCRemoteControlProvider`
2. Implement Master and Remote components
3. Use the `usePeer` hook for WebRTC communication

## Implementation Guide

### 1. Root Component Setup

You should initialize the WebRTC context like this:

```tsx
<WebRTCRemoteControlProvider
  mode={mode}
  init={({ getPeerId }) => new Peer(getPeerId() as string, getPeerjsConfig())}
  masterPeerId={window.location.hash?.replace("#", "") || undefined}
  sessionStorageKey="webrtc-remote-control-peer-id-react"
>
```

Three of those props carry more weight than they look:

- `mode` decides which side of the connection this page is, and comes from the URL - see
  [Mode Configuration](#mode-configuration) above.
- `masterPeerId` is the id a remote dials. On the master it is `undefined`.
- `sessionStorageKey` is what makes reconnection after a reload work. The peer id is stored
  under it, so a reloaded page asks PeerJS for the same id instead of being handed a new one.
  Give each mode of your app its own key, or two pages open side by side will fight over one
  id. Session storage is per tab, which is why it is the right place for this.

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
  // the type parameter picks the side you are on, so `api` is the master api
  const { ready, api, peer } = usePeer<"master">();
  const [remotesList, setRemotesList] = useState<RemoteCounter[]>([]);

  useEffect(() => {
    // `ready` guards every use of `api`, but it is a boolean the compiler
    // cannot tie to it, hence the `!` assertions below
    if (ready) {
      // Handle remote connections
      api!.on("remote.connect", ({ id }) => {
        setRemotesList((prev) => [...prev, { id, counter: 0 }]);
      });

      // Handle remote disconnections
      api!.on("remote.disconnect", ({ id }) => {
        setRemotesList((prev) => prev.filter((remote) => remote.id !== id));
      });

      // Handle incoming counter commands. `data` is whatever the remote sent,
      // so it arrives as `unknown` and you narrow it yourself.
      api!.on("data", ({ id }, data) => {
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
      {peer?.id && <QRCode value={peer.id} />}

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
  const { ready, api } = usePeer<"remote">();

  const increment = () => {
    if (ready) {
      api!.send({ type: "COUNTER_INCREMENT" });
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

- Use the `usePeer` hook for all WebRTC operations
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
