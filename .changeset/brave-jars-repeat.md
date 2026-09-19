---
"@webrtc-remote-control/react": patch
---

The provider no longer rebuilds the peer connection on every render. `utils` was
rebuilt each render and sat in the connection effect's dependencies, so any
re-render tore the connection down and called `init` again; `init` and
`humanErrors` were dependencies too, and both are normally written inline. The
connection is now established once per `mode`/`masterPeerId`/`sessionStorageKey`,
and the latest `init` and `humanErrors` are read when it is.

The context value is also replaced rather than mutated in place. `usePeer`
returns the same shape and no longer waits on a microtask to notice the peer has
arrived, so `ready` flips on the render that follows the connection resolving.
