---
"@webrtc-remote-control/core": minor
---

The `prepare` exported from `@webrtc-remote-control/core/remote` hands out an
`isIgnorableError` predicate, next to `humanizeError` and `reconnectNotice`.

While the retry loop runs, peerjs emits `peer-unavailable` for every attempt
that loses its race to the master re-registering its stored id. Running those
through `humanizeError` talks over the reconnection notice with advice to
reload, which is the one thing a user should not do mid-recovery - and the
message cannot simply be reworded, because on a first connection, which is never
retried, that advice is correct. What separates the two cases is whether the
retry loop is running, and until now every application had to shadow that with a
flag of its own, maintained across the `remote.reconnecting` and
`remote.reconnect` handlers.

```js
const { bindConnection, humanizeError, isIgnorableError } = prepare(utils);

peer.on("error", (error) => {
  console.error(error); // your logging still sees every error
  if (isIgnorableError(error)) {
    return;
  }
  setErrors([humanizeError(error)]);
});
```

Nothing is intercepted. The library does not subscribe to your `Peer`, wrap it
or filter it: you receive every event exactly as before, and you still write the
`return`. The predicate answers `true` only for `peer-unavailable`, and only
while a reconnection is in flight. It cannot tell which peer an error is about -
peerjs carries that id only inside the message text - so an application whose
`Peer` also connects to ids this library does not manage should not call it.

Only the remote side is handed one, for the same reason `reconnectNotice` is: a
master does not reconnect, its remotes reconnect to it.
