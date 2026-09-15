---
"@webrtc-remote-control/core": minor
---

Port `@webrtc-remote-control/core` to TypeScript and generate its declarations.

The sources are now `.ts` and `vp pack` generates `dist/*.d.ts` from them, so
the declarations can no longer drift from the implementation. The hand-written
ones are frozen under `legacy-types/` in the repository, where a compile-time
assignability test asserts the generated shapes still satisfy them. `peerjs`
supplies the `Peer` and `DataConnection` types that `bindConnection` and the
connection handling used to take as `any`.

Two runtime changes:

- **The library no longer writes to your console.** The `console.log` calls in
  the master and remote connection handlers are gone. A library has no business
  logging into the console of the application embedding it.
- **`send` on the remote side throws a real error when there is no
  connection.** That branch previously called `console.warning`, which is not a
  method of `Console`, so it already threw - with an unhelpful `TypeError`
  about a missing function. It now throws an `Error` naming the package and
  saying what went wrong. A plain `try`/`catch` is unaffected; a handler that
  narrowed on `e instanceof TypeError` no longer matches.

Four type-level changes, which can surface as new errors in TypeScript
consumers even though nothing about the runtime behaviour changed:

- `getPeerId` returns `string | null`, not `string`. It reads
  `sessionStorage.getItem`, which returns `null` when no peer id has been
  stored, so the old declaration was wrong and callers were not being told to
  handle the empty case. The one place this bites is the idiom from the README,
  `new Peer(getPeerId())`: peerjs's constructor takes `string | undefined`, so
  in TypeScript that becomes `new Peer(getPeerId() ?? undefined)`. JavaScript
  callers are unaffected - `null` was always what they were getting.
- `on` and `off` are typed by the events each side actually emits, rather than
  exposing eventemitter3's untyped signatures. Correct calls are unaffected; a
  listener with the wrong argument types, or a subscription to an event the
  library never emits, is now an error.
- `bindConnection` takes peerjs's `Peer` instead of `any`.
- The root export no longer declares `makeStoreAccessor`,
  `makeConnectionFilterUtilities` and `makeHumanizeError`. The old `index.d.ts`
  re-exported everything in `common`, but `index.js` never did, so importing
  any of the three from `"@webrtc-remote-control/core"` type-checked and then
  failed at runtime. `common` is not a public subpath, so they were never
  importable and are not importable now - only the declaration claimed
  otherwise. `prepareUtils` is unaffected and is still exported from `.`,
  `./master` and `./remote`.

The three public subpaths, the `exports` map and every runtime signature are
otherwise unchanged.
