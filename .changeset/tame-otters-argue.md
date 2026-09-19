---
"@webrtc-remote-control/core": patch
---

A master now closes a remote's previous connection itself as soon as a
reconnect for the same peer id arrives, instead of waiting on peerjs's own
failure detection to notice it went stale.

The old connection's `close` handler deleted the tracked connection by peer id
unconditionally, with no check that it was still the one the master was
holding for that id. When a remote reconnected - most commonly after a page
reload - and the stale connection's `close` arrived after the replacement had
already taken its place in the map, that belated close evicted the live
connection instead: `sendTo`/`sendAll` silently stopped reaching a remote the
application still showed as connected, and a `remote.disconnect` fired for a
peer that had not actually left. The master now closes a superseded connection
the moment it learns of its replacement, and ignores a stale connection's own
close if something has already taken its place in the map.
