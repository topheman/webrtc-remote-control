/**
 * Does the TypeScript port still describe the package that was published?
 *
 * The declarations under `../legacy-types/` are the hand-written ones this
 * package shipped before the port. tsdown now generates declarations from the
 * sources next to this file, so the way to keep "faithful port" honest is to
 * assert the new shapes are assignable to the frozen ones. A signature that
 * narrowed by accident fails `vp check` here rather than reaching a consumer.
 *
 * There is nothing to run: these are compile-time assertions, and the file is
 * named `.test-d.ts` so Vitest does not pick it up as a suite.
 */
import { expectTypeOf } from "expect-type";

import type legacyMasterPrepare from "../legacy-types/master.js";
import type legacyRemotePrepare from "../legacy-types/remote.js";
import type currentMasterPrepare from "./master.js";
import type currentRemotePrepare from "./remote.js";
import type { prepareUtils as currentPrepareUtils } from "./common.js";

type LegacyMasterApi = Awaited<
  ReturnType<ReturnType<typeof legacyMasterPrepare>["bindConnection"]>
>;
type CurrentMasterApi = Awaited<
  ReturnType<ReturnType<typeof currentMasterPrepare>["bindConnection"]>
>;

type LegacyRemoteApi = Awaited<
  ReturnType<ReturnType<typeof legacyRemotePrepare>["bindConnection"]>
>;
type CurrentRemoteApi = Awaited<
  ReturnType<ReturnType<typeof currentRemotePrepare>["bindConnection"]>
>;

// The two objects a consumer actually holds: whatever `bindConnection`
// resolves to on each side. Everything a consumer could call on the old type
// they can still call on the new one. `on` and `off` are compared separately
// below, because typing the events is a deliberate deviation.
expectTypeOf<Omit<CurrentMasterApi, "on" | "off">>().toExtend<
  Omit<LegacyMasterApi, "on" | "off">
>();
expectTypeOf<Omit<CurrentRemoteApi, "on" | "off">>().toExtend<
  Omit<LegacyRemoteApi, "on" | "off">
>();

// The four utilities `prepareUtils` hands to both sides. `getPeerId` is
// excluded deliberately - see the note below.
expectTypeOf<
  ReturnType<typeof currentPrepareUtils>["humanizeError"]
>().toExtend<(error: { type: string }) => string>();
expectTypeOf<
  ReturnType<typeof currentPrepareUtils>["isConnectionFromRemote"]
>().toExtend<(conn: { metadata?: unknown }) => boolean>();
expectTypeOf<
  ReturnType<typeof currentPrepareUtils>["setPeerIdToSessionStorage"]
>().toExtend<(peerId: string) => void>();

/**
 * Three deliberate deviations, asserted rather than left implicit.
 *
 * 1. `getPeerId` was declared to return `string`. It calls
 *    `sessionStorage.getItem`, which returns `null` when nothing is stored, so
 *    the old declaration was simply wrong and callers were not being told to
 *    handle the empty case. The empty case is spelled `undefined` rather than
 *    `null` so that `new Peer(getPeerId())` type checks: peerjs's constructor
 *    takes `string | undefined`, and both values already meant "allocate me
 *    one" at runtime.
 */
expectTypeOf<
  ReturnType<typeof currentPrepareUtils>["getPeerId"]
>().returns.toEqualTypeOf<string | undefined>();

/**
 * 2. `bindConnection` took `peer: any`. It now takes peerjs's own `Peer`, which
 *    is narrower - the whole point of depending on peerjs's types.
 */
expectTypeOf<
  Parameters<ReturnType<typeof currentMasterPrepare>["bindConnection"]>[0]
>().not.toBeAny();

/**
 * 3. `on` and `off` exposed eventemitter3's untyped signatures, so any event
 *    name was accepted and every listener argument was `any`. They are now
 *    typed by the events each side actually emits. Calls that were already
 *    correct still compile; a listener with the wrong argument types, or a
 *    subscription to an event the library never emits, no longer does.
 */
expectTypeOf<CurrentMasterApi["on"]>()
  .parameter(0)
  .toEqualTypeOf<"remote.connect" | "remote.disconnect" | "data">();
// `remote.reconnecting` is new in 0.3.0 and deliberately widens this set. The
// legacy declaration typed `on` as eventemitter3's untyped signature, so it
// accepted any event name and nothing narrows here - adding one is additive for
// consumers, who cannot have been subscribing to a name that did not exist.
expectTypeOf<CurrentRemoteApi["on"]>()
  .parameter(0)
  .toEqualTypeOf<
    "remote.disconnect" | "remote.reconnecting" | "remote.reconnect" | "data"
  >();

/**
 * 4. The root export declared everything in `common`, because `index.d.ts` did
 *    `export * from "./common.js"` while `index.js` re-exported only
 *    `prepareUtils`. The declarations followed the file rather than the module,
 *    and the generated ones now follow the module.
 */
// `makeReconnectNotice` is new in 0.3.0 and deliberately widens this set. The
// point of the assertion is that the root export follows the *module* rather
// than the file - a runtime export added on purpose is the case it is meant to
// allow, as opposed to `export *` quietly dragging the whole of `common` back in.
expectTypeOf<keyof typeof import("./index.js")>().toEqualTypeOf<
  "master" | "remote" | "prepareUtils" | "makeReconnectNotice"
>();
