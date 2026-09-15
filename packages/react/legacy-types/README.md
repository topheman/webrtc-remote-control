# Frozen pre-TypeScript declarations

These are the hand-written `.d.ts` files this package shipped before its
sources were ported to TypeScript. They are **frozen**: nothing imports them at
runtime, they are not published (`files` ships `dist` only), and they should not
be edited to track changes in `src`.

Their only job is to make "the port was faithful" checkable rather than a
claim. `src/assignability.test-d.ts` asserts that the declarations generated
from the TypeScript sources are still assignable to these, so a prop or a hook
result that narrowed during the port fails `vp check` instead of reaching a
consumer. The same arrangement guards `packages/core`.

One knowingly wrong thing is preserved here rather than corrected, because the
point is to record what was published: `Provider.d.ts` declares `humanErrors`
as `Partial<HumanErrorsMapping>`, the mapping of error type to message. The
prop is passed straight to core's `prepareUtils`, which expects the wrapper
around it - `{ mapping, withTechicalErrorMessage }`. Anyone who followed the old
declaration was writing a mapping that core then read for a `mapping` key and
found nothing, so the custom messages were silently ignored.

Delete this directory once a major release has gone out and the old shape no
longer needs defending.
