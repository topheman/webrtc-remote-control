// The demo loads peerjs from a `<script>` tag pointing at a CDN, so `Peer` only
// exists as a global on `window` - nothing in the demo imports it as a module.
// That is a limitation of peerjs and is not going to change, so rather than
// rewriting the demo to import the package, this types the global that is
// already there. `peerjs` is a devDependency of this workspace for its types
// only; it is never bundled.
//
// The root `vite.config.ts` does the same thing for linting, by declaring
// `Peer: "readonly"` in `lint.globals` so Oxlint's `no-undef` accepts it.
import type { Peer as PeerConstructor, PeerOptions } from "peerjs";

declare global {
  // The extra construct signature is deliberate. peerjs declares three
  // overloads - `()`, `(options)` and `(id: string, options?)` - and none of
  // them admits an absent id alongside options. Its implementation does: it
  // treats any falsy id as "allocate me one from the brokering server", which
  // is exactly what core's `getPeerId` returns on a first visit, and every
  // demo passes `getPeerjsConfig()` as the second argument. Declaring the
  // missing overload here, once, is what keeps `new Peer(getPeerId(), config)`
  // from having to assert the empty case away at every call site.
  const Peer: typeof PeerConstructor & {
    new (id: string | undefined, options?: PeerOptions): PeerConstructor;
  };
}

export {};
