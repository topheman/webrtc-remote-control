import { onUnmounted, provide, shallowRef } from "vue";
import type { InjectionKey, ShallowRef } from "vue";
import { master, prepareUtils, remote } from "@webrtc-remote-control/core";
import type {
  MakeHumanizeErrorOptions,
  MakeReconnectNoticeOptions,
  MasterBindConnectionApiResolved,
  RemoteBindConnectionApiResolved,
} from "@webrtc-remote-control/core";

/**
 * Whatever core's `bindConnection` accepts - peerjs's `Peer`, reached through
 * core rather than by depending on peerjs here. This package never imports
 * peerjs at runtime, and core already declares it as a peer dependency, so
 * naming the constraint this way keeps the dependency where it belongs.
 */
export type PeerInstance = Parameters<
  ReturnType<typeof master.default>["bindConnection"]
>[0];

/**
 * What `prepareUtils` hands out, before a side has been picked.
 *
 * The two parameters are the ones `makeReconnectNotice` infers from the
 * messages it was given: a notice may be anything core is handed, and each half
 * of it is typed independently.
 */
type PreparedUtils<TReconnecting = string, TStalled = string> = ReturnType<
  typeof prepareUtils<TReconnecting, TStalled>
>;

/**
 * The utilities the master side works with: core's own per-mode bundle, minus
 * the function that opens the connection.
 *
 * One type does two jobs on purpose. It is what `init` is handed, and it is the
 * constant half of what `useMaster` returns - `provideMaster` gives a consumer
 * exactly what it gives the callback. Deriving it from `master.default` rather
 * than writing the members out means core stays the only place they are named.
 *
 * These are plain values rather than refs: they are built once, when the
 * connection is, and never change. Only the connection below does.
 */
export type MasterUtils = Omit<
  ReturnType<typeof master.default>,
  "bindConnection"
> & { mode: "master" };

/**
 * The remote side's half of {@link MasterUtils}. It has no connection filter,
 * and it does carry a `reconnectNotice` - it is a remote that reconnects to its
 * master, not the other way round, so core hands one out on this side alone.
 */
export type RemoteUtils<TReconnecting = string, TStalled = string> = Omit<
  ReturnType<typeof remote.default<TReconnecting, TStalled>>,
  "bindConnection"
> & { mode: "remote"; masterPeerId: string };

/**
 * The part that changes over the life of a provider, as a union rather than a
 * flag: `ready` is what tells the compiler whether `api` is there.
 *
 * It is one value in one ref rather than a ref per member, because narrowing
 * only works on something a consumer can branch on: reading `state.value.ready`
 * is what makes `state.value.api` known to be there.
 */
export type Connection<TApi> =
  | { ready: false; peer: PeerInstance | null; api: undefined }
  | { ready: true; peer: PeerInstance; api: TApi };

/** What `useMaster` returns, and what `provideMaster` provides. */
export type UseMasterResult = MasterUtils & {
  state: Readonly<ShallowRef<Connection<MasterBindConnectionApiResolved>>>;
};

/** What `useRemote` returns, and what `provideRemote` provides. */
export type UseRemoteResult<
  TReconnecting = string,
  TStalled = string,
> = RemoteUtils<TReconnecting, TStalled> & {
  state: Readonly<ShallowRef<Connection<RemoteBindConnectionApiResolved>>>;
};

// use Symbol to avoid collision in provide/inject
export const MasterContext: InjectionKey<UseMasterResult> = Symbol(
  "master-webrtc-remote-control",
);
/**
 * The key is built once, at module scope, so it cannot carry the notice types a
 * given `provideRemote` call was instantiated with. `unknown` is what every
 * instantiation is assignable to - the notice is only ever returned, never
 * accepted - so providing needs no cast and `useRemote` can name what it wants.
 */
export const RemoteContext: InjectionKey<UseRemoteResult<unknown, unknown>> =
  Symbol("remote-webrtc-remote-control");

/** The options both sides share. */
export interface ProvideOptions<TReconnecting = string, TStalled = string> {
  sessionStorageKey?: string;
  humanErrors?: MakeHumanizeErrorOptions;
  /**
   * Only `provideRemote` offers this one - see {@link ProvideRemoteOptions}.
   * It is declared here because this is the bag the shared builder below reads.
   */
  reconnectNotice?: MakeReconnectNoticeOptions<TReconnecting, TStalled>;
}

export interface ProvideRemoteOptions<
  TReconnecting = string,
  TStalled = string,
> extends ProvideOptions<TReconnecting, TStalled> {
  masterPeerId: string;
  /**
   * The wording of the reconnection notice, handed to core's factory. Both
   * halves are inferred from what is passed, so returning something richer than
   * a string needs no annotation here - but the injection key cannot carry that
   * inference to `useRemote`, which names it again as a type argument.
   */
  reconnectNotice?: MakeReconnectNoticeOptions<TReconnecting, TStalled>;
}

/**
 * How a side wires core up: what the utilities look like once the side is
 * picked, and how to open the connection.
 */
type Wire<
  TUtils,
  TApi,
  TMasterPeerId extends string | undefined,
  TReconnecting = string,
  TStalled = string,
> = (
  prepared: PreparedUtils<TReconnecting, TStalled>,
  masterPeerId: TMasterPeerId,
) => { utils: TUtils; connect: (peer: PeerInstance) => Promise<TApi> };

const wireMaster: Wire<
  MasterUtils,
  MasterBindConnectionApiResolved,
  undefined
> = (prepared) => {
  const { bindConnection, ...utils } = master.default(prepared);
  return {
    utils: { ...utils, mode: "master" },
    connect: (peer) => bindConnection(peer),
  };
};

/**
 * A declaration rather than a typed const, because this one is generic in the
 * notice types and a const can only hold one instantiation of `Wire`.
 */
function wireRemote<TReconnecting, TStalled>(
  prepared: PreparedUtils<TReconnecting, TStalled>,
  masterPeerId: string,
): {
  utils: RemoteUtils<TReconnecting, TStalled>;
  connect: (peer: PeerInstance) => Promise<RemoteBindConnectionApiResolved>;
} {
  const { bindConnection, ...utils } = remote.default(prepared);
  return {
    utils: { ...utils, mode: "remote", masterPeerId },
    connect: (peer) => bindConnection(peer, masterPeerId),
  };
}

/**
 * The shared half of both composables. The split is in the public surface, not
 * in the implementation: the two sides differ only in the `Wire` they hand in.
 *
 * There is no `watchEffect` here. Nothing this reads is reactive - the mode, the
 * master's id and the options are plain arguments - so the effect the previous
 * version wrapped this in tracked nothing and ran exactly once. Saying that in
 * straight line code is the same behaviour, spelled honestly.
 */
function buildConnection<
  TUtils,
  TApi,
  TMasterPeerId extends string | undefined,
  TReconnecting = string,
  TStalled = string,
>(
  wire: Wire<TUtils, TApi, TMasterPeerId, TReconnecting, TStalled>,
  init: (utils: TUtils) => PeerInstance,
  masterPeerId: TMasterPeerId,
  {
    sessionStorageKey,
    humanErrors,
    reconnectNotice,
  }: ProvideOptions<TReconnecting, TStalled>,
): TUtils & { state: ShallowRef<Connection<TApi>> } {
  const { utils, connect } = wire(
    prepareUtils<TReconnecting, TStalled>({
      sessionStorageKey,
      humanErrors,
      reconnectNotice,
    }),
    masterPeerId,
  );
  // init callback that should return a peer instance like:
  // `({ getPeerId }) => new Peer(getPeerId())`
  const peer = init(utils);
  const state = shallowRef<Connection<TApi>>({
    ready: false,
    peer,
    api: undefined,
  });
  void connect(peer).then((api) => {
    // Replaced, never mutated: a shallow ref only notifies watchers when its
    // `.value` is reassigned, not when a member of it is written to.
    state.value = { ready: true, peer, api };
  });
  onUnmounted(() => {
    peer.disconnect();
  });
  return { ...utils, state };
}

export function provideMaster(
  init: (utils: MasterUtils) => PeerInstance,
  options: ProvideOptions = {},
): void {
  provide(MasterContext, buildConnection(wireMaster, init, undefined, options));
}

/**
 * `init` takes `RemoteUtils<unknown, unknown>`, and deliberately not
 * `RemoteUtils<TReconnecting, TStalled>`. That callback is context-sensitive -
 * `(utils) => new Peer(utils.getPeerId())` is what every consumer writes - so
 * TypeScript defers it to a second inference pass and, to type its parameter
 * contextually, fixes this function's type parameters first. Naming them there
 * fixes them at their `string` default before `options.reconnectNotice` is ever
 * read, and a message returning a `VNode` is then measured against `string`.
 * `unknown` is also honest - inside `init` the notice type is genuinely not
 * decided yet, which is the same reason the injection key carries `unknown`.
 *
 * `reconnect-notice.test-d.ts` fails to compile if this regresses.
 */
export function provideRemote<TReconnecting = string, TStalled = string>(
  init: (utils: RemoteUtils<unknown, unknown>) => PeerInstance,
  options: ProvideRemoteOptions<TReconnecting, TStalled>,
): void {
  const { masterPeerId } = options;
  // TypeScript rules this out for typed callers - the option is required. It
  // stays because the package is consumed from JavaScript too, and connecting
  // to `undefined` fails later and less clearly.
  if (!masterPeerId) {
    throw new Error("`masterPeerId` option required by `provideRemote`.");
  }
  provide(
    RemoteContext,
    buildConnection(wireRemote, init, masterPeerId, options),
  );
}
