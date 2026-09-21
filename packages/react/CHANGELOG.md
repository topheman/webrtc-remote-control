# Change Log

## 0.4.0

### Minor Changes

- [#67](https://github.com/topheman/webrtc-remote-control/pull/67) [`dd6f63d`](https://github.com/topheman/webrtc-remote-control/commit/dd6f63d78406a568ed7f03c0dff6a61b6ddb6088) Thanks [@topheman](https://github.com/topheman)! - `RemoteProvider` accepts a `reconnectNotice` option and `useRemote` hands the
  notice out, next to `humanizeError`:
  
  ```jsx
  const { reconnectNotice } = useRemote();
  
  api.on("remote.reconnecting", (payload) => {
    setStatus(reconnectNotice(payload));
  });
  ```
  
  Until now the notice was only reachable from core, so an application using this
  binding had to call `makeReconnectNotice()` itself, at module scope, outside the
  provider that owns every other message it shows. The wording now sits with
  `humanErrors`, on the provider, and is read once when the utilities are built -
  writing it inline does not rebuild the connection.
  
  `MasterProvider` and `useMaster` are unchanged: reconnecting is something a
  remote does to its master, not the other way round.
  
  One thing does not come for free. Core types the two halves of a notice
  independently and infers them from what you pass, so a notice may be a React
  node rather than a string. `RemoteProviderProps` infers them the same way, but a
  context is created once, at module scope, and cannot carry that inference to the
  hook. `useRemote` takes the same two type parameters instead, defaulting to
  `string`, so a caller who did not override the wording writes nothing and a
  caller who returns a node writes `useRemote<ReactNode>()`.
  
  The utilities `init` receives are typed `RemoteUtils<unknown, unknown>` rather
  than being parameterised on those two types. `init` is context-sensitive -
  `init={({ getPeerId }) => ...}` is what every consumer writes - so TypeScript
  defers it and, to type its parameter contextually, fixes the provider's type
  parameters before it reads `reconnectNotice`. Naming them on `init` fixed them
  at `string`, which made a notice returning a React node fail to compile. The
  only visible consequence is that `utils.reconnectNotice(...)` called from
  inside `init` returns `unknown`, which is the same thing the context carries.

### Patch Changes

- Updated dependencies [[`dd6f63d`](https://github.com/topheman/webrtc-remote-control/commit/dd6f63d78406a568ed7f03c0dff6a61b6ddb6088)]:
  - @webrtc-remote-control/core@0.4.0

## 0.3.1

### Patch Changes

- [#65](https://github.com/topheman/webrtc-remote-control/pull/65) [`ad94d46`](https://github.com/topheman/webrtc-remote-control/commit/ad94d468ccd13fe47d230f4babfcc789647fd4c2) Thanks [@topheman](https://github.com/topheman)! - Corrected the README of all three packages.
  
  The Usage section told you to load peerjs from a `<script>` tag, contradicting
  the Installation section three lines above it and the demo, which bundles peerjs
  as a normal import. It now shows the import, and explains the one cast
  TypeScript needs: `getPeerId()` returns `string | undefined`, peerjs declares no
  overload admitting an absent id alongside options, and the gap is in the types
  only - so it is closed in the types rather than by branching at runtime.
  
  The reconnection API added in 0.3.0 was documented nowhere. The core README now
  covers `remote.reconnecting`, `reconnectNotice` and `makeReconnectNotice`,
  including the `peer-unavailable` errors worth skipping while the retry loop is
  running. The react and vue READMEs point at it and state plainly that their
  bindings do not pass a `reconnectNotice` option through yet.
- Updated dependencies [[`ad94d46`](https://github.com/topheman/webrtc-remote-control/commit/ad94d468ccd13fe47d230f4babfcc789647fd4c2)]:
  - @webrtc-remote-control/core@0.3.1

## 0.3.0

### Minor Changes

- [#60](https://github.com/topheman/webrtc-remote-control/pull/60) [`b95d1e7`](https://github.com/topheman/webrtc-remote-control/commit/b95d1e7c7c33d4e0e87bc04a397d16a4eea7fe3a) Thanks [@topheman](https://github.com/topheman)! - Split the binding by mode: `MasterProvider`/`useMaster` and
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
  
  The exported types are renamed to match. A JavaScript consumer is unaffected; a
  TypeScript one that imports any of these has to update the import:
  
  | Before                                                | Now                                          |
  | ----------------------------------------------------- | -------------------------------------------- |
  | `ProviderProps`                                       | `MasterProviderProps`, `RemoteProviderProps` |
  | `ProviderInitOptions`, what `init` is handed          | `MasterUtils`, `RemoteUtils`                 |
  | `WebRTCRemoteControlContextValue`, `UsePeerResult<M>` | `UseMasterResult`, `UseRemoteResult`         |
  
  `Connection<TApi>` is new: it is the `ready`/`api`/`peer` union both hook
  results are built from, exported so a consumer can name the narrowed value.

### Patch Changes

- [#56](https://github.com/topheman/webrtc-remote-control/pull/56) [`2cf8f8f`](https://github.com/topheman/webrtc-remote-control/commit/2cf8f8f86fe751ad9f2fcd46b12a079af687f6aa) Thanks [@topheman](https://github.com/topheman)! - The provider no longer rebuilds the peer connection on every render. `utils` was
  rebuilt each render and sat in the connection effect's dependencies, so any
  re-render tore the connection down and called `init` again; `init` and
  `humanErrors` were dependencies too, and both are normally written inline. The
  connection is now established once per `mode`/`masterPeerId`/`sessionStorageKey`,
  and the latest `init` and `humanErrors` are read when it is.
  
  The context value is also replaced rather than mutated in place, so `ready`
  flips on the render that follows the connection resolving instead of waiting on
  a microtask.
  
  Both fixes are described here against the provider this release replaces. The
  binding was split by mode in the same version, so what ships is
  `MasterProvider`/`RemoteProvider`; see that entry for the shape they hand back.
- Updated dependencies [[`3653ddd`](https://github.com/topheman/webrtc-remote-control/commit/3653ddd1e75caa0b4dbb37845ab31b3d26c48426), [`d953051`](https://github.com/topheman/webrtc-remote-control/commit/d95305190e1add0364aef6d2179ea21130c5be6d), [`85141d3`](https://github.com/topheman/webrtc-remote-control/commit/85141d3a65dffdda92d93765826959476a7d32d7), [`9ffcfdf`](https://github.com/topheman/webrtc-remote-control/commit/9ffcfdf03434dcf5adc5e76926219ac5558cac92), [`acc08e1`](https://github.com/topheman/webrtc-remote-control/commit/acc08e1f9661a6cd5395b96a7eb470569bd0c9e1)]:
  - @webrtc-remote-control/core@0.3.0

## 0.2.1

### Minor Changes

- [#30](https://github.com/topheman/webrtc-remote-control/pull/30) [`421fa5a`](https://github.com/topheman/webrtc-remote-control/commit/421fa5aea8c848148e32523a542bb0aa8d72aa62) Thanks [@topheman](https://github.com/topheman)! - Port `@webrtc-remote-control/react` to TypeScript and generate its declarations.
  
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

- [#27](https://github.com/topheman/webrtc-remote-control/pull/27) [`0d3bab0`](https://github.com/topheman/webrtc-remote-control/commit/0d3bab061fc1c1acdb04681ed1245579fa5a73f6) Thanks [@topheman](https://github.com/topheman)! - Replace microbundle with `vp pack` (tsdown) and ship ES modules only.
  
  The packages now build from a single entry list per package, with `publint` and
  `attw` gating the `exports` map at build time. `@webrtc-remote-control/core` is
  flat: `master/` and `remote/` no longer carry a `package.json` apiece, and the
  `exports` map alone serves the two subpaths.
  
  The public subpaths are unchanged, so both of these keep working exactly as
  before:
  
  ```js
  import { master, remote, prepareUtils } from "@webrtc-remote-control/core";
  import prepare, { prepareUtils } from "@webrtc-remote-control/core/remote";
  ```
  
  What changes for consumers:
  
  - **No CommonJS and no UMD build.** The `main`, `module` and `unpkg` fields are
    gone, along with the `webrtc-remote-control*.umd.*.js` files that used to be
    reachable over unpkg. An ESM-aware bundler, or a browser loading
    `<script type="module">`, is now required.
  - **Pre-`exports` resolvers can no longer reach the core subpaths.** webpack 4
    and TypeScript's `moduleResolution: "node"` ignore the `exports` map and used
    to resolve `@webrtc-remote-control/core/master` by walking into the shipped
    `master/` directory. That directory is gone. Anything that reads `exports` -
    Node, Vite, webpack 5, TypeScript `bundler`/`node16`/`nodenext` - is
    unaffected.
  - **`files` no longer ships `src`.** Only `dist` is published, so deep imports
    into source paths stop resolving. Declarations moved with it, from
    `src/*.d.ts` to `dist/*.d.ts`.
  - `eventemitter3` moves from 4 to 5 in `@webrtc-remote-control/core`.
  
  React's JSX is still compiled with the classic `React.createElement` transform,
  so the `react >=16.8.0` peer range continues to hold.

### Patch Changes

- [`3c18036`](https://github.com/topheman/webrtc-remote-control/commit/3c180361ba110decee8ac0a20d9bc4f20aeefb91) Thanks [@topheman](https://github.com/topheman)! - Fix the release pipeline so published tarballs no longer carry literal pnpm protocol strings.

  `0.2.0` shipped with `"@webrtc-remote-control/core": "workspace:^"` literally in `dependencies`, because the release script shelled out to `npm publish` on the raw package directory instead of `pnpm publish`, and npm's publish path never rewrites pnpm's `workspace:` protocol into a real version range. No registry resolves `workspace:^`, so `npm install @webrtc-remote-control/react@0.2.0` failed outright for every consumer. `pnpm publish` performs that rewrite natively, so this release restores it.

- [#36](https://github.com/topheman/webrtc-remote-control/pull/36) [`82f8d1c`](https://github.com/topheman/webrtc-remote-control/commit/82f8d1cce5a3e2ea382d3acbfc72c20e13f5afa6) Thanks [@topheman](https://github.com/topheman)! - Known issues carried over on purpose, to be fixed in 0.3.0.
  
  This release is the TypeScript port and the toolchain move, and it was held to a
  "no behaviour changes" line throughout: where the port found a bug, it typed it
  and left it running rather than fixing it in the same breath. That keeps this
  version comparable with 0.1.3 - if something behaves differently for you here,
  it is a regression worth reporting, not a fix you were not told about.
  
  The following are known, reproduced and deliberately unfixed. Each gets its own
  pull request, and they land together in **0.3.0**:
  
  - **The remote retries a failed connection exactly once, immediately, with no
    backoff** (`@webrtc-remote-control/core`). When a master reloads, whether the
    remote reconnects is decided by which side wins a race: the remote's single
    retry against the master re-registering its peer id. It usually works, and
    when it does not the remote stays disconnected with no further attempt. The
    fix is a bounded retry with exponential backoff on `peer-unavailable`.
  - **The remote's `beforeunload` handler does nothing**
    (`@webrtc-remote-control/core`). It calls `disconnect()` on the data
    connection if that method exists, but `disconnect` belongs to PeerJS's `Peer`,
    not to `DataConnection`, so the guard has never been true against real PeerJS.
    Making it work means calling `close()`, which really does change what a master
    observes when a remote's page goes away.
  - **The React provider re-runs its effect on every render**
    (`@webrtc-remote-control/react`). The effect depends on a `utils` object that
    is rebuilt each render, so the connection is torn down and `init` called again
    far more often than intended.
  - **`ready` does not narrow `api`.** `usePeer` returns them as independent
    fields, so every use of `api` behind an `if (ready)` guard needs a non-null
    assertion. A discriminated result would make the guard do that work, and
    delete the assertions from consuming code. Same runtime, wider inference.
  
  `getPeerId` returning `string | null` is in the same family and is described in
  the core entry for this release; the ergonomics of the `new Peer(getPeerId())`
  idiom are part of the same 0.3.0 pass.

- [#35](https://github.com/topheman/webrtc-remote-control/pull/35) [`da0bfd7`](https://github.com/topheman/webrtc-remote-control/commit/da0bfd78d485a91ed4fd7f54f320b64edecf1e85) Thanks [@topheman](https://github.com/topheman)! - Point the READMEs at the demo sources that exist, and at the React LLM guide.
  
  Documentation only - no code in either package changes.
  
  The "direct link to source code" line still pointed at `master.js` / `remote.js`
  in core and `App.jsx` / `Master.jsx` / `Remote.jsx` in react. The demo was
  ported to TypeScript, so all five of those links were 404s.
  
  `@webrtc-remote-control/react` also gains a short section pointing at
  `demo/counter-react/llm.md`, a guide written for coding assistants. It covers
  what the declarations cannot: that the mode is derived from the URL hash, what
  `sessionStorageKey` buys you on reload, and which responsibilities sit with the
  package rather than with the application embedding it.

- [#29](https://github.com/topheman/webrtc-remote-control/pull/29) [`d2f998b`](https://github.com/topheman/webrtc-remote-control/commit/d2f998b33fc9784e49972c284fb57a141f4600c1) Thanks [@topheman](https://github.com/topheman)! - Point the peerjs `<script>` snippet in the README at 1.5.5 instead of 1.5.4.
  
  Documentation only - no code in any of the three packages changes. peerjs 1.5.5
  is a release-tooling fix with no runtime difference from 1.5.4, and the demo now
  loads that version, so the copy-pasteable snippet matches what the demo actually
  runs.
- Updated dependencies [[`0d3bab0`](https://github.com/topheman/webrtc-remote-control/commit/0d3bab061fc1c1acdb04681ed1245579fa5a73f6), [`82f8d1c`](https://github.com/topheman/webrtc-remote-control/commit/82f8d1cce5a3e2ea382d3acbfc72c20e13f5afa6), [`d88d683`](https://github.com/topheman/webrtc-remote-control/commit/d88d683d93918963495c1e7177e2cb62203541e7), [`da0bfd7`](https://github.com/topheman/webrtc-remote-control/commit/da0bfd78d485a91ed4fd7f54f320b64edecf1e85), [`421fa5a`](https://github.com/topheman/webrtc-remote-control/commit/421fa5aea8c848148e32523a542bb0aa8d72aa62), [`d2f998b`](https://github.com/topheman/webrtc-remote-control/commit/d2f998b33fc9784e49972c284fb57a141f4600c1), [`3c18036`](https://github.com/topheman/webrtc-remote-control/commit/3c180361ba110decee8ac0a20d9bc4f20aeefb91)]:
  - @webrtc-remote-control/core@0.2.1

## 0.2.0

Published with a broken release pipeline and removed from the registry. The
release script shelled out to `npm publish` on the raw package directory
instead of `pnpm publish`, which never rewrites pnpm's `workspace:` protocol -
so this version shipped with `"@webrtc-remote-control/core": "workspace:^"`
literally in `dependencies`. No registry resolves that, so
`npm install @webrtc-remote-control/react@0.2.0` failed outright for every
consumer. The real content of this release, and the pipeline fix, are in
**0.2.1** above.

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.3](https://github.com/topheman/webrtc-remote-control/compare/@webrtc-remote-control/react@0.1.2...@webrtc-remote-control/react@0.1.3) (2025-05-27)


### Bug Fixes

* correct nested type declaration ([af5194e](https://github.com/topheman/webrtc-remote-control/commit/af5194e696693440c27cd002cc104681722b3b29))





## [0.1.2](https://github.com/topheman/webrtc-remote-control/compare/@webrtc-remote-control/react@0.1.1...@webrtc-remote-control/react@0.1.2) (2025-05-21)


### Features

* **peerjs:** upgrade peerjs on demos from 1.3.2 to 1.4.6 ([4b89d7a](https://github.com/topheman/webrtc-remote-control/commit/4b89d7ad7993a6b3bf7f31e034ed9b4ac19f3b74))





## [0.1.1](https://github.com/topheman/webrtc-remote-control/compare/@webrtc-remote-control/react@0.1.0...@webrtc-remote-control/react@0.1.1) (2022-06-13)

**Note:** Version bump only for package @webrtc-remote-control/react





# [0.1.0](https://github.com/topheman/webrtc-remote-control/compare/@webrtc-remote-control/react@0.0.1...@webrtc-remote-control/react@0.1.0) (2022-04-16)


### Features

* update homepage in package.json ([4038fd5](https://github.com/topheman/webrtc-remote-control/commit/4038fd51ac19f7285808de4ac8ad21eb7a461ab7))
