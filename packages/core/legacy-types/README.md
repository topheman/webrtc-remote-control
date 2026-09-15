# Frozen pre-TypeScript declarations

These are the hand-written `.d.ts` files this package shipped before its
sources were ported to TypeScript. They are **frozen**: nothing imports them at
runtime, they are not published (`files` ships `dist` only), and they should not
be edited to track changes in `src`.

Their only job is to make "the port was faithful" checkable rather than a
claim. `src/assignability.test-d.ts` asserts that the declarations generated
from the TypeScript sources are still assignable to these, so a signature that
narrowed or widened during the port fails `vp check` instead of reaching a
consumer.

Two knowingly wrong things are preserved here rather than corrected, because the
point is to record what was published:

- `index.d.ts` does `export * from "./common.js"`, so it declares
  `makeStoreAccessor`, `makeConnectionFilterUtilities` and `makeHumanizeError`.
  `src/index.js` never re-exported any of them.
- `bindConnection` took `peer: any`. The port types it as peerjs's own `Peer`,
  which is narrower, and the assignability test is written to allow that
  direction.

Delete this directory once a major release has gone out and the old shape no
longer needs defending.
