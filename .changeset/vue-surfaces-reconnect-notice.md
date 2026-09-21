---
"@webrtc-remote-control/vue": minor
---

`provideRemote` accepts a `reconnectNotice` option and `useRemote` hands the
notice out, next to `humanizeError`:

```js
const { reconnectNotice } = useRemote();

api.on("remote.reconnecting", (payload) => {
  errors.value = [reconnectNotice(payload)];
});
```

Until now the notice was only reachable from core, so an application using this
binding had to call `makeReconnectNotice()` itself, outside the provider that
owns every other message it shows. The wording now sits with `humanErrors`, in
the options `provideRemote` takes.

`provideMaster` and `useMaster` are unchanged: reconnecting is something a
remote does to its master, not the other way round.

One thing does not come for free. Core types the two halves of a notice
independently and infers them from what you pass, so a notice may be a `VNode`
rather than a string. `ProvideRemoteOptions` infers them the same way, but the
injection key is created once, at module scope, and cannot carry that inference
to the composable. `useRemote` takes the same two type parameters instead,
defaulting to `string`, so a caller who did not override the wording writes
nothing and a caller who returns a node writes `useRemote<VNode>()`.
