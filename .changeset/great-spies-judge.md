---
"@webrtc-remote-control/vue": minor
---

Port `@webrtc-remote-control/vue` to TypeScript and generate its declarations.

The sources are now `.ts` and `vp pack` generates `dist/vue.d.ts` from them, so
the declarations can no longer drift from the implementation. The hand-written
ones are frozen under `legacy-types/` in the repository, where a compile-time
assignability test asserts the generated shapes still satisfy them.

One runtime change:

- **The library no longer writes to your console.** Eight `console.log` calls
  are gone: four in the provider - its master-mode guard, its watcher, its
  promise handler and its cleanup - and four in `usePeer`. A library has no
  business logging into the console of the application embedding it. This was
  the last of the three packages still doing it.

Two type-level changes, which can surface as new errors in TypeScript consumers
even though nothing about the runtime behaviour changes:

- `humanErrors` is typed as `MakeHumanizeErrorOptions` -
  `{ mapping, withTechicalErrorMessage }` - rather than the mapping of error
  type to message. The option has always been handed straight to core's
  `prepareUtils`, which reads a `mapping` key off it, so anyone who followed the
  old declaration and passed a bare mapping was having their custom messages
  silently ignored. Wrap what you were passing in `{ mapping: ... }`.
- `init` is typed as returning the peer that core's `bindConnection` accepts,
  rather than `any`.

The provider's public types - `ProvideInitOptions`,
`ProvideWebRTCRemoteControlOptions`, `PeerInstance`,
`WebRTCRemoteControlContextValue`, `UsePeerState` and `UsePeerResult` - are
exported, so a consumer can name the options of a composable that wraps
`provideWebTCRemoteControl` without redeclaring them.
