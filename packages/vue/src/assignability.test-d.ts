/**
 * Does the TypeScript port still describe the package that was published?
 *
 * The declarations under `../legacy-types/` are the hand-written ones this
 * package shipped before the port. tsdown now generates declarations from the
 * sources next to this file, so the way to keep "faithful port" honest is to
 * assert the new shapes still satisfy the frozen ones. An option that stopped
 * being accepted, or a hook result that lost a member, fails `vp check` here
 * rather than reaching a consumer.
 *
 * There is nothing to run: these are compile-time assertions, and the file is
 * named `.test-d.ts` so Vitest does not collect it. `packages/core` and
 * `packages/react` carry the same guard.
 */
import { expectTypeOf } from "expect-type";
import type { MakeHumanizeErrorOptions } from "@webrtc-remote-control/core";

import { provideWebTCRemoteControl as legacyProvide } from "../legacy-types/vue.js";
import { usePeer as legacyUsePeer } from "../legacy-types/vue.js";
import { provideWebTCRemoteControl as currentProvide } from "./vue.js";
import { usePeer as currentUsePeer } from "./vue.js";

type LegacyParams = Parameters<typeof legacyProvide>;
type CurrentParams = Parameters<typeof currentProvide>;

type LegacyOptions = NonNullable<LegacyParams[2]>;
type CurrentOptions = NonNullable<CurrentParams[2]>;

// The `init` callback and the mode are unchanged: every callback the old
// signature accepted the new one still accepts.
expectTypeOf<LegacyParams[0]>().toExtend<CurrentParams[0]>();
expectTypeOf<LegacyParams[1]>().toEqualTypeOf<CurrentParams[1]>();

// Options are an input, so the direction is the other way round from a return
// type: every options object the old signature accepted the new one still
// accepts. `humanErrors` is excluded because its old declaration named the
// wrong type - see the deviation below.
expectTypeOf<Omit<LegacyOptions, "humanErrors">>().toExtend<
  Omit<CurrentOptions, "humanErrors">
>();

// Still a side effect, not a value.
expectTypeOf<ReturnType<typeof currentProvide>>().toEqualTypeOf<
  ReturnType<typeof legacyProvide>
>();

// The refs a consumer holds after calling the hook, on each side. Everything
// the old result offered is still there, with the same types - except
// `peerReady`, which is excluded because it no longer exists. See the
// deviation below.
expectTypeOf<
  Omit<ReturnType<typeof currentUsePeer<"master">>, "peerReady">
>().toExtend<Omit<ReturnType<typeof legacyUsePeer<"master">>, "peerReady">>();
expectTypeOf<
  Omit<ReturnType<typeof currentUsePeer<"remote">>, "peerReady">
>().toExtend<Omit<ReturnType<typeof legacyUsePeer<"remote">>, "peerReady">>();

/**
 * One deliberate deviation, asserted rather than left implicit. It is the same
 * one the react binding carries.
 *
 * `humanErrors` was declared as `Partial<HumanErrorsMapping>`, a mapping of
 * peerjs error type to message. The option is handed straight to core's
 * `prepareUtils`, which expects the wrapper around that mapping. Following the
 * old declaration produced an object core read a `mapping` key from and found
 * nothing in, so the custom messages were silently dropped.
 */
expectTypeOf<CurrentOptions["humanErrors"]>().toEqualTypeOf<
  MakeHumanizeErrorOptions | undefined
>();
expectTypeOf<LegacyOptions["humanErrors"]>().not.toEqualTypeOf<
  CurrentOptions["humanErrors"]
>();

/**
 * The other deliberate deviation. `peerReady` flipped once the injected `peer`
 * existed - back when the context was a ref mutated in place, so a flag
 * flipped from an effect was the only way a consumer could learn something
 * had changed. The provider now replaces the injected value wholesale once
 * the peer exists, so `peer` itself is already on the context by the time
 * `usePeer` runs; a consumer that wants to know when it exists can watch
 * `peer` directly and does not need a second flag for it.
 */
expectTypeOf<ReturnType<typeof legacyUsePeer<"master">>>().toHaveProperty(
  "peerReady",
);
expectTypeOf<ReturnType<typeof currentUsePeer<"master">>>().not.toHaveProperty(
  "peerReady",
);
