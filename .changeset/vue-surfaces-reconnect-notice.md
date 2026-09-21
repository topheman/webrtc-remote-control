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

The utilities `init` receives are typed `RemoteUtils<unknown, unknown>` rather
than being parameterised on those two types. `init` is context-sensitive -
`(utils) => new Peer(utils.getPeerId())` is what every consumer writes - so
TypeScript defers it and, to type its parameter contextually, fixes
`provideRemote`'s type parameters before it reads the options. Naming them on
`init` fixed them at `string`, which made a notice returning a `VNode` fail to
compile. The only visible consequence is that `utils.reconnectNotice(...)`
called from inside `init` returns `unknown`, which is the same thing the
injection key carries.
