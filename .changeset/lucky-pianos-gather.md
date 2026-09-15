---
"@webrtc-remote-control/core": minor
"@webrtc-remote-control/react": minor
"@webrtc-remote-control/vue": minor
---

Replace microbundle with `vp pack` (tsdown) and ship ES modules only.

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
