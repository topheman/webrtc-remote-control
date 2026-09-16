---
"@webrtc-remote-control/core": patch
"@webrtc-remote-control/react": patch
"@webrtc-remote-control/vue": patch
---

Known issues carried over on purpose, to be fixed in 0.3.0.

This release is the TypeScript port and the toolchain move, and it was held to a
"no behaviour changes" line throughout: where the port found a bug, it typed it
and left it running rather than fixing it in the same breath. That keeps this
version comparable with 0.1.3 - if something behaves differently for you here,
it is a regression worth reporting, not a fix you were not told about.

The following are known, reproduced and deliberately unfixed. Each gets its own
pull request, and they land together in **0.3.0**:

- **The remote retries a failed connection exactly once, immediately, with no
  backoff** (`@webrtc-remote-control/core`). When a master reloads, whether the
  remote reconnects is decided by which side wins a race: the remote's single
  retry against the master re-registering its peer id. It usually works, and
  when it does not the remote stays disconnected with no further attempt. The
  fix is a bounded retry with exponential backoff on `peer-unavailable`.
- **The remote's `beforeunload` handler does nothing**
  (`@webrtc-remote-control/core`). It calls `disconnect()` on the data
  connection if that method exists, but `disconnect` belongs to PeerJS's `Peer`,
  not to `DataConnection`, so the guard has never been true against real PeerJS.
  Making it work means calling `close()`, which really does change what a master
  observes when a remote's page goes away.
- **The React provider re-runs its effect on every render**
  (`@webrtc-remote-control/react`). The effect depends on a `utils` object that
  is rebuilt each render, so the connection is torn down and `init` called again
  far more often than intended.
- **`ready` does not narrow `api`.** `usePeer` returns them as independent
  fields, so every use of `api` behind an `if (ready)` guard needs a non-null
  assertion. A discriminated result would make the guard do that work, and
  delete the assertions from consuming code. Same runtime, wider inference.

`getPeerId` returning `string | null` is in the same family and is described in
the core entry for this release; the ergonomics of the `new Peer(getPeerId())`
idiom are part of the same 0.3.0 pass.
