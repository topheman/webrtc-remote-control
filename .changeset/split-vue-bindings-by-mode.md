---
"@webrtc-remote-control/vue": minor
---

Split the binding by mode: `provideMaster`/`useMaster` and
`provideRemote`/`useRemote` replace `provideWebTCRemoteControl` and
`usePeer<M>()`, mirroring the react package. This is a breaking change on a 0.x
line. The two sides have their own injection key, so calling the wrong hook is
caught instead of handing back a master api typed as a remote one.

The result is no longer a bag of refs. `ToRefs<...>` is precisely what cannot
express "the api is there once ready" - narrowing `ready.value` says nothing
about `api.value`, which is why every consumer wrote `api!.value!`. The members
that never change are plain values now (`humanizeError` is a function, not a ref
wrapping one), and the one that does is a single `state` ref holding a
discriminated union: `if (state.value.ready)` narrows `state.value.api` and
`state.value.peer`.

Also gone: `peerReady`, which only existed because the context used to be a ref
mutated in place, and `masterPeerId` as an optional option - it is required by
`provideRemote` and absent from `provideMaster`.
