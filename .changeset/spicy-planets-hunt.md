---
"@webrtc-remote-control/vue": minor
---

The injected context is now replaced rather than mutated in place: `usePeer`
no longer waits on a `Promise.resolve()` microtask to notice the peer has
arrived, and `ready` is now derived directly from whether the resolved api is
there instead of being flipped by a separate effect.

`peerReady` is removed from `usePeer`'s result. It existed only to tell a
consumer the injected `peer` had become non-null, which was needed because the
old context was a `shallowRef` mutated in place - `peer` itself never
triggered reactivity. Now that the context is replaced wholesale once the peer
exists, `peer` is available (and reactive) on its own; a consumer that
watched `peerReady` should watch `peer` directly instead.
