# Change Log

## 0.2.1

### Minor Changes

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

- [#28](https://github.com/topheman/webrtc-remote-control/pull/28) [`d88d683`](https://github.com/topheman/webrtc-remote-control/commit/d88d683d93918963495c1e7177e2cb62203541e7) Thanks [@topheman](https://github.com/topheman)! - Port `@webrtc-remote-control/core` to TypeScript and generate its declarations.
  
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

### Patch Changes

- [`3c18036`](https://github.com/topheman/webrtc-remote-control/commit/3c180361ba110decee8ac0a20d9bc4f20aeefb91) Thanks [@topheman](https://github.com/topheman)! - Fix the release pipeline so published tarballs no longer carry literal pnpm protocol strings.

  `0.2.0` shipped with `vite` and `vite-plus` still pinned to `catalog:` in `devDependencies`, because the release script shelled out to `npm publish` on the raw package directory instead of `pnpm publish`, and npm's publish path never rewrites pnpm's `workspace:`/`catalog:` protocols. This is cosmetic for `@webrtc-remote-control/core` - `devDependencies` are never installed by a consumer - but it is wrong metadata on the published package. `pnpm publish` performs that rewrite natively, so this release restores it.

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

- [#30](https://github.com/topheman/webrtc-remote-control/pull/30) [`421fa5a`](https://github.com/topheman/webrtc-remote-control/commit/421fa5aea8c848148e32523a542bb0aa8d72aa62) Thanks [@topheman](https://github.com/topheman)! - Re-export the types of the four utilities `prepareUtils` returns.
  
  `GetPeerIdType`, `HumanizeErrorType`, `IsConnectionFromRemoteType` and
  `SetPeerIdToSessionStorageType` are importable from
  `"@webrtc-remote-control/core"` again. The pre-TypeScript `index.d.ts` declared
  them because it re-exported all of `common`, and the react and vue bindings name
  them in their own public declarations, so dropping them during the TypeScript
  port would have broken those packages' types. They are type-only exports;
  nothing about the runtime module changes.

- [#29](https://github.com/topheman/webrtc-remote-control/pull/29) [`d2f998b`](https://github.com/topheman/webrtc-remote-control/commit/d2f998b33fc9784e49972c284fb57a141f4600c1) Thanks [@topheman](https://github.com/topheman)! - Point the peerjs `<script>` snippet in the README at 1.5.5 instead of 1.5.4.
  
  Documentation only - no code in any of the three packages changes. peerjs 1.5.5
  is a release-tooling fix with no runtime difference from 1.5.4, and the demo now
  loads that version, so the copy-pasteable snippet matches what the demo actually
  runs.

## 0.2.0

Published with a broken release pipeline and removed from the registry. The
release script shelled out to `npm publish` on the raw package directory
instead of `pnpm publish`, which never rewrites pnpm's `workspace:`/`catalog:`
protocols - so this version shipped with `vite` and `vite-plus` pinned to the
literal string `catalog:` in `devDependencies`. Cosmetic only, since
`devDependencies` are never installed by a consumer, but it was wrong metadata
on a published package. The real content of this release, and the pipeline
fix, are in **0.2.1** above.

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.1.3](https://github.com/topheman/webrtc-remote-control/compare/@webrtc-remote-control/core@0.1.2...@webrtc-remote-control/core@0.1.3) (2025-05-27)

**Note:** Version bump only for package @webrtc-remote-control/core





## [0.1.2](https://github.com/topheman/webrtc-remote-control/compare/@webrtc-remote-control/core@0.1.1...@webrtc-remote-control/core@0.1.2) (2025-05-21)


### Bug Fixes

* correct types for esm ([3e65e30](https://github.com/topheman/webrtc-remote-control/commit/3e65e3093988d1b8bb6523995d0ee96f9f705323))
* missing shared folder in packages.json#files of core - failing types ([1276866](https://github.com/topheman/webrtc-remote-control/commit/12768665885a0897e5a3e2d0a83d42514280e673))


### Features

* **peerjs:** upgrade peerjs on demos from 1.3.2 to 1.4.6 ([4b89d7a](https://github.com/topheman/webrtc-remote-control/commit/4b89d7ad7993a6b3bf7f31e034ed9b4ac19f3b74))





## [0.1.1](https://github.com/topheman/webrtc-remote-control/compare/@webrtc-remote-control/core@0.1.0...@webrtc-remote-control/core@0.1.1) (2022-06-13)


### Bug Fixes

* **core:** missing types for core/shared ([8a91135](https://github.com/topheman/webrtc-remote-control/commit/8a91135ef6965dcf754851fd8ddd08f6095b6397))





# [0.1.0](https://github.com/topheman/webrtc-remote-control/compare/@webrtc-remote-control/core@0.0.1...@webrtc-remote-control/core@0.1.0) (2022-04-16)


### Features

* update homepage in package.json ([4038fd5](https://github.com/topheman/webrtc-remote-control/commit/4038fd51ac19f7285808de4ac8ad21eb7a461ab7))
