---
"@webrtc-remote-control/core": patch
---

Stop a remote from reconnecting when the application destroys its peer. peerjs closes the connections before it marks the peer destroyed, so the remote used to reconnect from inside `peer.destroy()`, opening a signaling socket that kept the peer id taken until the page unloaded. `remote.disconnect` and `remote.reconnecting` are no longer emitted in that case.
