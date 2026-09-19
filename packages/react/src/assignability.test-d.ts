/**
 * What of the published package survived the split, and what deliberately did
 * not?
 *
 * The declarations under `../legacy-types/` are the hand-written ones this
 * package shipped before the TypeScript port. tsdown now generates declarations
 * from the sources next to this file, so the way to keep the port honest is to
 * assert the new shapes still satisfy the frozen ones.
 *
 * One provider with a `mode` prop became `MasterProvider` and `RemoteProvider`,
 * and `usePeer<M>()` became `useMaster()` and `useRemote()`, so parts of the old
 * surface are gone on purpose. Those are asserted below too, each with its
 * reason - the point of the guard is that a deviation is argued for rather than
 * discovered by a consumer. What is *not* deliberate still fails here: the
 * callback both providers accept, the options they take and the members the
 * hook results carry are all checked against what was published.
 *
 * There is nothing to run: these are compile-time assertions, and the file is
 * named `.test-d.ts` so Vitest does not collect it. `packages/core` carries the
 * same guard.
 */
import { expectTypeOf } from "expect-type";
import type { MakeHumanizeErrorOptions } from "@webrtc-remote-control/core";

import type { Provider as legacyProvider } from "../legacy-types/Provider.js";
import type { usePeer as legacyUsePeer } from "../legacy-types/hooks.js";
import type {
  MasterProvider as currentMasterProvider,
  RemoteProvider as currentRemoteProvider,
} from "./Provider.js";
import type { useMaster, useRemote } from "./hooks.js";
import type * as currentModule from "./react.js";

type LegacyProviderProps = Parameters<typeof legacyProvider>[0];
type MasterProps = Parameters<typeof currentMasterProvider>[0];
type RemoteProps = Parameters<typeof currentRemoteProvider>[0];

// The `init` callback is an input, so the direction is the other way round from
// a return type: every callback the old provider accepted, both new ones still
// accept. This is what says the master side is still handed the connection
// filter and the remote side still is not.
expectTypeOf<LegacyProviderProps["init"]>().toExtend<MasterProps["init"]>();
expectTypeOf<LegacyProviderProps["init"]>().toExtend<RemoteProps["init"]>();

// Same direction, for the options that are not the mode: `children`,
// `sessionStorageKey` and `humanErrors` are unchanged on both sides.
// `humanErrors` is excluded because its old declaration named the wrong type -
// see the deviation below.
type LegacyCommonProps = Omit<
  LegacyProviderProps,
  "humanErrors" | "init" | "mode" | "masterPeerId"
>;
expectTypeOf<LegacyCommonProps>().toExtend<
  Omit<MasterProps, "humanErrors" | "init">
>();
expectTypeOf<LegacyCommonProps>().toExtend<
  Omit<RemoteProps, "humanErrors" | "init" | "masterPeerId">
>();

// The element type is unchanged - both providers render what the old one did.
expectTypeOf<ReturnType<typeof currentMasterProvider>>().toExtend<
  ReturnType<typeof legacyProvider>
>();
expectTypeOf<ReturnType<typeof currentRemoteProvider>>().toExtend<
  ReturnType<typeof legacyProvider>
>();

// The object a consumer holds after calling the hook, on each side. Everything
// the old result offered is still there, with the same types - `ready`, `api`,
// `peer`, `mode`, `humanizeError` and, on the master side, the connection
// filter. The new results are unions, so this also says both members of each
// union carry the whole set. `isConnectionFromRemote` is excluded from the
// remote side - see the deviation below.
expectTypeOf<ReturnType<typeof useMaster>>().toExtend<
  ReturnType<typeof legacyUsePeer<"master">>
>();
expectTypeOf<ReturnType<typeof useRemote>>().toExtend<
  Omit<ReturnType<typeof legacyUsePeer<"remote">>, "isConnectionFromRemote">
>();

/**
 * Deviation, carried over from the port: `humanErrors` was declared as
 * `Partial<HumanErrorsMapping>`, a mapping of peerjs error type to message. The
 * prop is handed straight to core's `prepareUtils`, which expects the wrapper
 * around that mapping. Following the old declaration produced an object core
 * read a `mapping` key from and found nothing in, so the custom messages were
 * silently dropped.
 */
expectTypeOf<MasterProps["humanErrors"]>().toEqualTypeOf<
  MakeHumanizeErrorOptions | undefined
>();
expectTypeOf<RemoteProps["humanErrors"]>().toEqualTypeOf<
  MakeHumanizeErrorOptions | undefined
>();
expectTypeOf<LegacyProviderProps["humanErrors"]>().not.toEqualTypeOf<
  MasterProps["humanErrors"]
>();

/**
 * Deviation: the single provider and the single hook are gone.
 *
 * `mode` was a string prop the compiler could not use, so which side a consumer
 * was on had to be asserted twice - once to the provider as a value, once to
 * the hook as a type argument - and neither assertion was checked against the
 * other. Picking the side by picking the export removes both.
 */
expectTypeOf<typeof currentModule>().not.toHaveProperty(
  "WebRTCRemoteControlProvider",
);
expectTypeOf<typeof currentModule>().not.toHaveProperty("usePeer");
expectTypeOf<MasterProps>().not.toHaveProperty("mode");
expectTypeOf<RemoteProps>().not.toHaveProperty("mode");

/**
 * Deviation: `masterPeerId` is required rather than optional, and only exists
 * on the remote side.
 *
 * The old provider accepted it in either mode and threw at runtime for the two
 * illegal combinations - present in master mode, absent in remote mode. Neither
 * is representable now, so two of the three constructor guards are gone with
 * no behaviour to replace them.
 */
expectTypeOf<RemoteProps["masterPeerId"]>().toEqualTypeOf<string>();
expectTypeOf<MasterProps>().not.toHaveProperty("masterPeerId");

/**
 * Deviation: the remote side no longer carries `isConnectionFromRemote`.
 *
 * It used to be there as a permanent `undefined` - the conditional type said as
 * much - because one hook served both sides and had to declare every member of
 * either. The filter is a master-side concern: it is what the master uses to
 * tell a connection this library opened from one the application opened itself.
 * With a hook per side there is nothing left to stand in for.
 */
expectTypeOf<ReturnType<typeof legacyUsePeer<"remote">>>().toHaveProperty(
  "isConnectionFromRemote",
);
expectTypeOf<ReturnType<typeof useRemote>>().not.toHaveProperty(
  "isConnectionFromRemote",
);
