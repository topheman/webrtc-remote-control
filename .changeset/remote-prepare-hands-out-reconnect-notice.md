---
"@webrtc-remote-control/core": minor
---

`prepare` from `@webrtc-remote-control/core/remote` now hands back the
`reconnectNotice` it was given, alongside `humanizeError` and `getPeerId`.

`prepareUtils` has built one since 0.3.0, but the per-mode bundle dropped it, so
the only way to reach it was to keep the `prepareUtils` result around. That is
fine in a vanilla application and impossible in a binding, which hands the
bundle out and keeps nothing - which is why the react and vue packages could not
offer a notice at all.

The remote side is the only one that gets it. `prepare` from
`@webrtc-remote-control/core/master` is unchanged, because a master does not
"reconnect" - the remotes reconnect to their master.

`PrepareRemoteUtils` gains an optional `reconnectNotice`, and `prepare` fills in
the default factory when it is absent, so what it returns always has one. A
caller handing in a bundle of their own rather than the one `prepareUtils`
builds keeps compiling, and still gets a notice.
