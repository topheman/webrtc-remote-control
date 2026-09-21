---
"@webrtc-remote-control/vue": minor
---

`useRemote` hands out core's new `isIgnorableError`, next to `humanizeError` and
`reconnectNotice`, so a remote page no longer needs a ref to remember whether a
reconnection is in flight:

```js
const { humanizeError, isIgnorableError } = useRemote();

peer.on("error", (error) => {
  if (isIgnorableError(error)) {
    return;
  }
  errors.value = [humanizeError(error)];
});
```

Your `peer.on("error")` subscription is untouched - every error still reaches
your handler, and the predicate only decides which are worth showing. `useMaster`
has no counterpart: a master does not reconnect.
