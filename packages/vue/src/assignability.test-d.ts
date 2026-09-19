/**
 * What of the published package survived the split, and what deliberately did
 * not?
 *
 * The declarations under `../legacy-types/` are the hand-written ones this
 * package shipped before the TypeScript port. tsdown now generates declarations
 * from the sources next to this file, so the way to keep the port honest is to
 * assert the new shapes still satisfy the frozen ones.
 *
 * One composable with a `mode` argument became `provideMaster` and
 * `provideRemote`, and `usePeer<M>()` became `useMaster()` and `useRemote()`, so
 * parts of the old surface are gone on purpose. Those are asserted below too,
 * each with its reason - the point of the guard is that a deviation is argued
 * for rather than discovered by a consumer. What is *not* deliberate still fails
 * here: the callback both composables accept and the options they take are
 * checked against what was published.
 *
 * There is nothing to run: these are compile-time assertions, and the file is
 * named `.test-d.ts` so Vitest does not collect it. `packages/core` and
 * `packages/react` carry the same guard.
 */
import { expectTypeOf } from "expect-type";
import type {
  HumanizeErrorType,
  MakeHumanizeErrorOptions,
} from "@webrtc-remote-control/core";

import { provideWebTCRemoteControl as legacyProvide } from "../legacy-types/vue.js";
import { usePeer as legacyUsePeer } from "../legacy-types/vue.js";
import { provideMaster, provideRemote } from "./vue.js";
import { useMaster, useRemote } from "./vue.js";
import type * as currentModule from "./vue.js";

type LegacyParams = Parameters<typeof legacyProvide>;
type LegacyOptions = NonNullable<LegacyParams[2]>;
type MasterOptions = NonNullable<Parameters<typeof provideMaster>[1]>;
type RemoteOptions = Parameters<typeof provideRemote>[1];

// The `init` callback is an input, so the direction is the other way round from
// a return type: every callback the old composable accepted, both new ones
// still accept. This is what says the master side is still handed the
// connection filter and the remote side still is not.
expectTypeOf<LegacyParams[0]>().toExtend<Parameters<typeof provideMaster>[0]>();
expectTypeOf<LegacyParams[0]>().toExtend<Parameters<typeof provideRemote>[0]>();

// Same direction, for the options that are not the mode. `humanErrors` is
// excluded because its old declaration named the wrong type - see the deviation
// below.
expectTypeOf<Omit<LegacyOptions, "humanErrors" | "masterPeerId">>().toExtend<
  Omit<MasterOptions, "humanErrors">
>();
expectTypeOf<Omit<LegacyOptions, "humanErrors" | "masterPeerId">>().toExtend<
  Omit<RemoteOptions, "humanErrors" | "masterPeerId">
>();

// Still a side effect, not a value.
expectTypeOf<ReturnType<typeof provideMaster>>().toEqualTypeOf<
  ReturnType<typeof legacyProvide>
>();
expectTypeOf<ReturnType<typeof provideRemote>>().toEqualTypeOf<
  ReturnType<typeof legacyProvide>
>();

/**
 * Deviation, carried over from the port: `humanErrors` was declared as
 * `Partial<HumanErrorsMapping>`, a mapping of peerjs error type to message. The
 * option is handed straight to core's `prepareUtils`, which expects the wrapper
 * around that mapping. Following the old declaration produced an object core
 * read a `mapping` key from and found nothing in, so the custom messages were
 * silently dropped.
 */
expectTypeOf<MasterOptions["humanErrors"]>().toEqualTypeOf<
  MakeHumanizeErrorOptions | undefined
>();
expectTypeOf<LegacyOptions["humanErrors"]>().not.toEqualTypeOf<
  MasterOptions["humanErrors"]
>();

/**
 * Deviation: the single composable and the single hook are gone.
 *
 * `mode` was a string argument the compiler could not use, so which side a
 * consumer was on had to be asserted twice - once to the provider as a value,
 * once to the hook as a type argument - and neither assertion was checked
 * against the other. Picking the side by picking the export removes both.
 */
expectTypeOf<typeof currentModule>().not.toHaveProperty(
  "provideWebTCRemoteControl",
);
expectTypeOf<typeof currentModule>().not.toHaveProperty("usePeer");
expectTypeOf<Parameters<typeof provideMaster>["length"]>().toEqualTypeOf<
  1 | 2
>();

/**
 * Deviation: `masterPeerId` is required rather than optional, and only exists
 * on the remote side.
 *
 * The old composable accepted it in either mode and threw at runtime for the
 * two illegal combinations - present in master mode, absent in remote mode.
 * Neither is representable now, so two of the three constructor guards are gone
 * with no behaviour to replace them.
 */
expectTypeOf<RemoteOptions["masterPeerId"]>().toEqualTypeOf<string>();
expectTypeOf<MasterOptions>().not.toHaveProperty("masterPeerId");

/**
 * Deviation: the result is no longer a bag of refs.
 *
 * `usePeer` returned `ToRefs<...>`, one ref per member, and that is precisely
 * what cannot express "the api is there once ready" - narrowing `ready.value`
 * says nothing about `api.value`, which is why every consumer wrote `api!.value!`.
 * The members that never change are plain values now, and the one that does is a
 * single ref holding a discriminated union.
 */
expectTypeOf<
  ReturnType<typeof legacyUsePeer<"master">>["humanizeError"]
>().toExtend<{ value: unknown }>();
expectTypeOf<
  ReturnType<typeof useMaster>["humanizeError"]
>().toEqualTypeOf<HumanizeErrorType>();
expectTypeOf<ReturnType<typeof useMaster>["state"]["value"]>().toExtend<{
  ready: boolean;
}>();
expectTypeOf<ReturnType<typeof useRemote>["state"]["value"]>().toExtend<{
  ready: boolean;
}>();

/**
 * Deviation: `peerReady` is gone - this one predates the split.
 *
 * It flipped once the injected `peer` existed, back when the context was a ref
 * mutated in place, so a flag flipped from an effect was the only way a consumer
 * could learn something had changed. A consumer that wants to know when the peer
 * exists can read `state.value.peer`.
 */
expectTypeOf<ReturnType<typeof legacyUsePeer<"master">>>().toHaveProperty(
  "peerReady",
);
expectTypeOf<ReturnType<typeof useMaster>>().not.toHaveProperty("peerReady");
