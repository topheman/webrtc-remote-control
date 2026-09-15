---
"@webrtc-remote-control/core": patch
---

Re-export the types of the four utilities `prepareUtils` returns.

`GetPeerIdType`, `HumanizeErrorType`, `IsConnectionFromRemoteType` and
`SetPeerIdToSessionStorageType` are importable from
`"@webrtc-remote-control/core"` again. The pre-TypeScript `index.d.ts` declared
them because it re-exported all of `common`, and the react and vue bindings name
them in their own public declarations, so dropping them during the TypeScript
port would have broken those packages' types. They are type-only exports;
nothing about the runtime module changes.
