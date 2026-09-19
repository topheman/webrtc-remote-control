---
"@webrtc-remote-control/react": minor
---

Split the binding by mode: `MasterProvider`/`useMaster` and
`RemoteProvider`/`useRemote` replace the single `WebRTCRemoteControlProvider`
and `usePeer<M>()`. This is a breaking change on a 0.x line.

Core is already split by side - `@webrtc-remote-control/core/master` and
`/remote` are separate entry points with their own `bindConnection` - and this
package used to merge the two back together behind a `mode` string, then pull
them apart again with conditional types, a caller-supplied type parameter and
three runtime throws. Picking the side by picking the import removes all of
that, and with it the two combinations the old provider could only reject at
runtime: `masterPeerId` is now a required prop of `RemoteProvider` and does not
exist on `MasterProvider`.

What changes for a consumer:

- `ready` narrows. The hook returns a discriminated union, so `if (ready)` is
  what makes `api` and `peer` known to be there. Every `api!` and `peer!` goes
  away. A callback that outlives the branch has to read `ready` itself.
- `useMaster()` and `useRemote()` take no type argument. Which side you are on
  comes from which provider is above you, so the side can no longer be asserted
  as one thing and provided as another.
- The remote side no longer carries `isConnectionFromRemote`. It is a
  master-side filter, and only existed on the remote side as a permanent
  `undefined` because one hook served both.
- `humanizeError` is present from the first render. It used to be put on the
  context from inside the connection effect while being typed as always there,
  so it was `undefined` until that effect ran.
