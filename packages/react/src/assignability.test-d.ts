/**
 * Does the TypeScript port still describe the package that was published?
 *
 * The declarations under `../legacy-types/` are the hand-written ones this
 * package shipped before the port. tsdown now generates declarations from the
 * sources next to this file, so the way to keep "faithful port" honest is to
 * assert the new shapes still satisfy the frozen ones. A prop that stopped
 * being accepted, or a hook result that lost a member, fails `vp check` here
 * rather than reaching a consumer.
 *
 * There is nothing to run: these are compile-time assertions, and the file is
 * named `.test-d.ts` so Vitest does not collect it. `packages/core` carries the
 * same guard.
 */
import { expectTypeOf } from "expect-type";
import type { MakeHumanizeErrorOptions } from "@webrtc-remote-control/core";

import type { Provider as legacyProvider } from "../legacy-types/Provider.js";
import type { usePeer as legacyUsePeer } from "../legacy-types/hooks.js";
import type { Provider as currentProvider } from "./Provider.js";
import type { usePeer as currentUsePeer } from "./hooks.js";

type LegacyProviderProps = Parameters<typeof legacyProvider>[0];
type CurrentProviderProps = Parameters<typeof currentProvider>[0];

// Props are an input, so the direction is the other way round from a return
// type: every props object the old component accepted the new one still
// accepts. `humanErrors` is excluded because its old declaration named the
// wrong type - see the deviation below.
expectTypeOf<Omit<LegacyProviderProps, "humanErrors">>().toExtend<
  Omit<CurrentProviderProps, "humanErrors">
>();

// The element type is unchanged.
expectTypeOf<ReturnType<typeof currentProvider>>().toEqualTypeOf<
  ReturnType<typeof legacyProvider>
>();

// The object a consumer holds after calling the hook, on each side. Everything
// the old result offered is still there, with the same types.
expectTypeOf<ReturnType<typeof currentUsePeer<"master">>>().toExtend<
  ReturnType<typeof legacyUsePeer<"master">>
>();
expectTypeOf<ReturnType<typeof currentUsePeer<"remote">>>().toExtend<
  ReturnType<typeof legacyUsePeer<"remote">>
>();

/**
 * One deliberate deviation, asserted rather than left implicit.
 *
 * `humanErrors` was declared as `Partial<HumanErrorsMapping>`, a mapping of
 * peerjs error type to message. The prop is handed straight to core's
 * `prepareUtils`, which expects the wrapper around that mapping. Following the
 * old declaration produced an object core read a `mapping` key from and found
 * nothing in, so the custom messages were silently dropped.
 */
expectTypeOf<CurrentProviderProps["humanErrors"]>().toEqualTypeOf<
  MakeHumanizeErrorOptions | undefined
>();
expectTypeOf<LegacyProviderProps["humanErrors"]>().not.toEqualTypeOf<
  CurrentProviderProps["humanErrors"]
>();
