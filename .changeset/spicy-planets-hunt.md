---
"@webrtc-remote-control/vue": minor
---

The injected context is now replaced rather than mutated in place, so a
consumer no longer waits on a `Promise.resolve()` microtask to notice the peer
has arrived, and `ready` is derived directly from whether the resolved api is
there instead of being flipped by a separate effect.

That is what removed `peerReady`. It existed only to tell a consumer the
injected `peer` had become non-null, which was needed because the old context
was a `shallowRef` mutated in place - `peer` itself never triggered reactivity.
With the context replaced wholesale, the peer is reactive on its own.

The binding was also split by mode in this release, so `usePeer` is gone
entirely and there is no `peer` ref to watch in its place: read
`state.value.peer` off `useMaster()` or `useRemote()`, which is non-null exactly
when `state.value.ready` is true. See that entry for the full shape.
