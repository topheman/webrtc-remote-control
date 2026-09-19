import { onUnmounted, provide, shallowRef } from "vue";
import type { InjectionKey, ShallowRef } from "vue";
import { master, prepareUtils, remote } from "@webrtc-remote-control/core";
import type {
  MakeHumanizeErrorOptions,
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

/** What `prepareUtils` hands out, before a side has been picked. */
type PreparedUtils = ReturnType<typeof prepareUtils>;

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

/** The remote side's half of {@link MasterUtils}. It has no connection filter. */
export type RemoteUtils = Omit<
  ReturnType<typeof remote.default>,
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
export type UseRemoteResult = RemoteUtils & {
  state: Readonly<ShallowRef<Connection<RemoteBindConnectionApiResolved>>>;
};

// use Symbol to avoid collision in provide/inject
export const MasterContext: InjectionKey<UseMasterResult> = Symbol(
  "master-webrtc-remote-control",
);
export const RemoteContext: InjectionKey<UseRemoteResult> = Symbol(
  "remote-webrtc-remote-control",
);

/** The options both sides share. */
export interface ProvideOptions {
  sessionStorageKey?: string;
  humanErrors?: MakeHumanizeErrorOptions;
}

export interface ProvideRemoteOptions extends ProvideOptions {
  masterPeerId: string;
}

/**
 * How a side wires core up: what the utilities look like once the side is
 * picked, and how to open the connection.
 */
type Wire<TUtils, TApi, TMasterPeerId extends string | undefined> = (
  prepared: PreparedUtils,
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

const wireRemote: Wire<RemoteUtils, RemoteBindConnectionApiResolved, string> = (
  prepared,
  masterPeerId,
) => {
  const { bindConnection, ...utils } = remote.default(prepared);
  return {
    utils: { ...utils, mode: "remote", masterPeerId },
    connect: (peer) => bindConnection(peer, masterPeerId),
  };
};

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
>(
  wire: Wire<TUtils, TApi, TMasterPeerId>,
  init: (utils: TUtils) => PeerInstance,
  masterPeerId: TMasterPeerId,
  { sessionStorageKey, humanErrors }: ProvideOptions,
): TUtils & { state: ShallowRef<Connection<TApi>> } {
  const { utils, connect } = wire(
    prepareUtils({ sessionStorageKey, humanErrors }),
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

export function provideRemote(
  init: (utils: RemoteUtils) => PeerInstance,
  options: ProvideRemoteOptions,
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
