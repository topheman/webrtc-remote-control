---
"@webrtc-remote-control/core": minor
---

`getPeerId` returns `string | undefined` instead of `string | null`

`getPeerId` reads the peer id kept in session storage and returns the empty case
on a first visit, which peerjs takes as "allocate me one". That empty case used
to be `null`, straight from `sessionStorage.getItem`. peerjs's constructor is
`(id?: string, options?)`, so `null` worked at runtime but not in the
declaration, and every `new Peer(getPeerId(), ...)` call site in TypeScript had
to assert the value back to `string` - asserting away exactly the case the type
existed to describe.

It now returns `undefined`, so `new Peer(getPeerId(), getPeerjsConfig())` type
checks as written. Nothing changes at runtime: peerjs treats both as "generate
one".

If you test the result for emptiness (`if (!id)`, `id ?? fallback`) or pass it
straight to `new Peer`, there is nothing to do. If you compare against `null`
explicitly - `getPeerId() === null` - switch to `undefined` or to a falsy check.
JavaScript consumers are unaffected.
