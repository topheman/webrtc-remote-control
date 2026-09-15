// The demo loads peerjs from a `<script>` tag pointing at a CDN, so `Peer` only
// exists as a global on `window` - nothing in the demo imports it as a module.
// That is a limitation of peerjs and is not going to change, so rather than
// rewriting the demo to import the package, this types the global that is
// already there. `peerjs` is a devDependency of this workspace for its types
// only; it is never bundled.
//
// The root `vite.config.ts` does the same thing for linting, by declaring
// `Peer: "readonly"` in `lint.globals` so Oxlint's `no-undef` accepts it.
import type { Peer as PeerConstructor } from "peerjs";

declare global {
  const Peer: typeof PeerConstructor;
}

export {};
