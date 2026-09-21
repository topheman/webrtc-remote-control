// `React` itself is used: `pack` compiles JSX with the classic runtime, so the
// providers below emit `React.createElement` and need the default import in
// scope. Dropping it builds fine and throws in the browser.
import React, {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
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
 * messages it was given: a notice may be anything, a React node included, and
 * core types each half of it independently.
 */
type PreparedUtils<TReconnecting = string, TStalled = string> = ReturnType<
  typeof prepareUtils<TReconnecting, TStalled>
>;

/**
 * The utilities the master side works with: core's own per-mode bundle, minus
 * the function that opens the connection.
 *
 * One type does two jobs on purpose. It is what `init` is handed, and it is the
 * constant half of what `useMaster` returns - the provider gives a consumer
 * exactly what it gives the callback. Deriving it from `master.default` rather
 * than writing the members out means core stays the only place they are named.
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
 * `ready: false` covers two runtime states - the first render, before the
 * connection effect has built a peer, and the wait for the api to resolve - so
 * `peer` is nullable there and known present once `ready` is true.
 */
export type Connection<TApi> =
  | { ready: false; peer: PeerInstance | null; api: undefined }
  | { ready: true; peer: PeerInstance; api: TApi };

/** What `useMaster` returns, and what the master context carries. */
export type UseMasterResult = MasterUtils &
  Connection<MasterBindConnectionApiResolved>;

/** What `useRemote` returns, and what the remote context carries. */
export type UseRemoteResult<
  TReconnecting = string,
  TStalled = string,
> = RemoteUtils<TReconnecting, TStalled> &
  Connection<RemoteBindConnectionApiResolved>;

export const MasterContext = createContext<UseMasterResult | undefined>(
  undefined,
);
/**
 * The context is built once, at module scope, so it cannot carry the notice
 * types a given `RemoteProvider` was instantiated with. `unknown` is what every
 * instantiation is assignable to - the notice is only ever returned, never
 * accepted - so providing needs no cast and `useRemote` can name what it wants.
 */
export const RemoteContext = createContext<
  UseRemoteResult<unknown, unknown> | undefined
>(undefined);

/** The options both sides share, minus what only a component needs. */
interface ConnectionOptions<TReconnecting = string, TStalled = string> {
  sessionStorageKey?: string;
  humanErrors?: MakeHumanizeErrorOptions;
  /**
   * Only the remote provider offers this one - see {@link RemoteProviderProps}.
   * It is declared here because this is the bag the shared hook below reads.
   */
  reconnectNotice?: MakeReconnectNoticeOptions<TReconnecting, TStalled>;
}

interface ProviderPropsBase {
  children: ReactNode;
  sessionStorageKey?: string;
  humanErrors?: MakeHumanizeErrorOptions;
}

export interface MasterProviderProps extends ProviderPropsBase {
  init: (utils: MasterUtils) => PeerInstance;
}

export interface RemoteProviderProps<
  TReconnecting = string,
  TStalled = string,
> extends ProviderPropsBase {
  masterPeerId: string;
  /**
   * `unknown`, and deliberately not `RemoteUtils<TReconnecting, TStalled>`.
   * This callback is context-sensitive - `init={({ getPeerId }) => ...}` is
   * what every consumer writes - so TypeScript defers it to a second inference
   * pass and, to type its parameter contextually, fixes this component's type
   * parameters first. Naming them here fixes them at their `string` default
   * before `reconnectNotice` is ever read, and a message returning a React node
   * is then measured against `string`. `NoInfer` does not help: it removes the
   * inference site, not the fixing. `unknown` is also honest - inside `init`
   * the notice type is genuinely not decided yet, which is the same reason the
   * context below carries `unknown`.
   *
   * `reconnect-notice.test-d.tsx` fails to compile if this regresses.
   */
  init: (utils: RemoteUtils<unknown, unknown>) => PeerInstance;
  /**
   * The wording of the reconnection notice, handed to core's factory. Both
   * halves are inferred from what is passed, so returning something richer than
   * a string needs no annotation here - but the context cannot carry that
   * inference to `useRemote`, which names it again as a type argument.
   */
  reconnectNotice?: MakeReconnectNoticeOptions<TReconnecting, TStalled>;
}

/**
 * How a side wires core up: what the utilities look like once the side is
 * picked, and how to open the connection. Declared at module scope so the two
 * are stable values rather than something rebuilt every render.
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
 * notice types and a const can only hold one instantiation of `Wire`. It is
 * still a stable value, which is what the effect below depends on.
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
 * The shared half of both providers. The split is in the public surface, not
 * in the implementation: the two sides differ only in the `Wire` they hand in.
 */
function useWrcConnection<
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
  }: ConnectionOptions<TReconnecting, TStalled>,
): TUtils & Connection<TApi> {
  /**
   * `humanErrors` and `reconnectNotice` describe the messages, not the
   * connection. A caller writing one inline hands a fresh object every render,
   * and rebuilding the utilities on that would hand every consumer a new
   * `humanizeError` each time. They are read when the utilities are built and
   * later edits to them are not picked up.
   */
  const [initialHumanErrors] = useState(humanErrors);
  const [initialReconnectNotice] = useState(reconnectNotice);
  const { utils, connect } = useMemo(
    () =>
      wire(
        prepareUtils<TReconnecting, TStalled>({
          sessionStorageKey,
          humanErrors: initialHumanErrors,
          reconnectNotice: initialReconnectNotice,
        }),
        masterPeerId,
      ),
    [
      wire,
      masterPeerId,
      sessionStorageKey,
      initialHumanErrors,
      initialReconnectNotice,
    ],
  );
  /**
   * `init` is read by the connection effect but deliberately kept out of its
   * dependencies: a caller writing `init={({ getPeerId }) => ...}` inline hands
   * a fresh function every render, and re-running the effect on that would tear
   * the peer down and rebuild it. The connection belongs to the utilities it
   * was opened with, not to a callback identity, so the latest value is
   * mirrored onto a ref instead. This effect is declared first, so on mount it
   * runs before the one below.
   */
  const initRef = useRef(init);
  useEffect(() => {
    initRef.current = init;
  });
  const [connection, setConnection] = useState<Connection<TApi>>({
    ready: false,
    peer: null,
    api: undefined,
  });
  useEffect(() => {
    // init callback that should return a peer instance like:
    // `({ getPeerId }) => new Peer(getPeerId())`
    const peer = initRef.current(utils);
    setConnection({ ready: false, peer, api: undefined });
    let current = true;
    void connect(peer).then((api) => {
      if (current) {
        setConnection({ ready: true, peer, api });
      }
    });
    return () => {
      // The api this promise resolves to belongs to a peer that is about to be
      // disconnected, so a late resolution must not be published.
      current = false;
      peer.disconnect();
    };
  }, [utils, connect]);
  return connection.ready
    ? { ...utils, ready: true, peer: connection.peer, api: connection.api }
    : { ...utils, ready: false, peer: connection.peer, api: undefined };
}

export function MasterProvider({
  children,
  init,
  sessionStorageKey,
  humanErrors,
}: MasterProviderProps): ReactElement {
  const value = useWrcConnection(wireMaster, init, undefined, {
    sessionStorageKey,
    humanErrors,
  });
  return (
    <MasterContext.Provider value={value}>{children}</MasterContext.Provider>
  );
}

export function RemoteProvider<TReconnecting = string, TStalled = string>({
  children,
  init,
  masterPeerId,
  sessionStorageKey,
  humanErrors,
  reconnectNotice,
}: RemoteProviderProps<TReconnecting, TStalled>): ReactElement {
  // TypeScript rules this out for typed callers - the prop is required. It
  // stays because the package is consumed from JavaScript too, and connecting
  // to `undefined` fails later and less clearly.
  if (!masterPeerId) {
    throw new Error("`masterPeerId` prop required by `RemoteProvider`.");
  }
  const value = useWrcConnection(wireRemote, init, masterPeerId, {
    sessionStorageKey,
    humanErrors,
    reconnectNotice,
  });
  return (
    <RemoteContext.Provider value={value}>{children}</RemoteContext.Provider>
  );
}
