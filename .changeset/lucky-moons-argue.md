---
"@webrtc-remote-control/react": minor
---

Port `@webrtc-remote-control/react` to TypeScript and generate its declarations.

The sources are now `.ts` and `.tsx` and `vp pack` generates `dist/react.d.ts`
from them, so the declarations can no longer drift from the implementation. The
hand-written ones are frozen under `legacy-types/` in the repository, where a
compile-time assignability test asserts the generated shapes still satisfy them.

Two runtime changes:

- **The library no longer writes to your console.** The `console.log` call in
  the provider's master-mode guard is gone. A library has no business logging
  into the console of the application embedding it.
- **`prop-types` is no longer a dependency.** React 19 ignores `propTypes`
  entirely and TypeScript checks the props at build time instead, so the runtime
  validation it bought has nothing left to do. If you were relying on the
  development-mode warnings, the types now tell you the same things earlier. One
  fewer package is installed alongside this one.

Two type-level changes, which can surface as new errors in TypeScript consumers
even though nothing about the runtime behaviour changes:

- `humanErrors` is typed as `MakeHumanizeErrorOptions` -
  `{ mapping, withTechicalErrorMessage }` - rather than the mapping of error
  type to message. The prop has always been handed straight to core's
  `prepareUtils`, which reads a `mapping` key off it, so anyone who followed the
  old declaration and passed a bare mapping was having their custom messages
  silently ignored. Wrap what you were passing in `{ mapping: ... }`.
- `init` is typed as returning the peer that core's `bindConnection` accepts,
  rather than `any`.

The provider's public types - `ProviderProps`, `ProviderInitOptions`,
`PeerInstance`, `WebRTCRemoteControlContextValue` and `UsePeerResult` - are
exported, so a consumer can name the props of a component that wraps the
provider without redeclaring them.
