---
"@webrtc-remote-control/core": patch
"@webrtc-remote-control/react": patch
"@webrtc-remote-control/vue": patch
---

Corrected the README of all three packages.

The Usage section told you to load peerjs from a `<script>` tag, contradicting
the Installation section three lines above it and the demo, which bundles peerjs
as a normal import. It now shows the import, and explains the one cast
TypeScript needs: `getPeerId()` returns `string | undefined`, peerjs declares no
overload admitting an absent id alongside options, and the gap is in the types
only - so it is closed in the types rather than by branching at runtime.

The reconnection API added in 0.3.0 was documented nowhere. The core README now
covers `remote.reconnecting`, `reconnectNotice` and `makeReconnectNotice`,
including the `peer-unavailable` errors worth skipping while the retry loop is
running. The react and vue READMEs point at it and state plainly that their
bindings do not pass a `reconnectNotice` option through yet.
