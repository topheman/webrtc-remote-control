---
"@webrtc-remote-control/core": patch
---

A remote now closes its data connection when its page goes away, so the master
learns a remote has left as soon as it happens.

The `beforeunload` handler called `conn.disconnect()` behind an `if` guard, and
`disconnect` is a method of peerjs's `Peer`, not of `DataConnection` - so the
guard has never been true and the handler has never done anything. A master was
left waiting for the data channel to time out on its own before it saw
`remote.disconnect`. The handler now calls `conn.close()`, and abandons the
current connection generation first so the close it causes is read as the
teardown it is rather than as an outage worth retrying from a page that is
already unloading.
