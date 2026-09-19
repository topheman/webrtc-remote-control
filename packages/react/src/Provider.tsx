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
 * constant half of what `useMaster` returns - the provider gives a consumer
 * exactly what it gives the callback. Deriving it from `master.default` rather
 * than writing the members out means core stays the only place they are named.
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
export type UseRemoteResult = RemoteUtils &
  Connection<RemoteBindConnectionApiResolved>;

export const MasterContext = createContext<UseMasterResult | undefined>(
  undefined,
);
export const RemoteContext = createContext<UseRemoteResult | undefined>(
  undefined,
);

/** The options both sides share, minus what only a component needs. */
interface ConnectionOptions {
  sessionStorageKey?: string;
  humanErrors?: MakeHumanizeErrorOptions;
}

interface ProviderPropsBase extends ConnectionOptions {
  children: ReactNode;
}

export interface MasterProviderProps extends ProviderPropsBase {
  init: (utils: MasterUtils) => PeerInstance;
}

export interface RemoteProviderProps extends ProviderPropsBase {
  masterPeerId: string;
  init: (utils: RemoteUtils) => PeerInstance;
}

/**
 * How a side wires core up: what the utilities look like once the side is
 * picked, and how to open the connection. Declared at module scope so the two
 * are stable values rather than something rebuilt every render.
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
 * The shared half of both providers. The split is in the public surface, not
 * in the implementation: the two sides differ only in the `Wire` they hand in.
 */
function useWrcConnection<
  TUtils,
  TApi,
  TMasterPeerId extends string | undefined,
>(
  wire: Wire<TUtils, TApi, TMasterPeerId>,
  init: (utils: TUtils) => PeerInstance,
  masterPeerId: TMasterPeerId,
  { sessionStorageKey, humanErrors }: ConnectionOptions,
): TUtils & Connection<TApi> {
  /**
   * `humanErrors` describes the messages, not the connection. A caller writing
   * it inline hands a fresh object every render, and rebuilding the utilities
   * on that would hand every consumer a new `humanizeError` each time. It is
   * read when the utilities are built and later edits to it are not picked up.
   */
  const [initialHumanErrors] = useState(humanErrors);
  const { utils, connect } = useMemo(
    () =>
      wire(
        prepareUtils({ sessionStorageKey, humanErrors: initialHumanErrors }),
        masterPeerId,
      ),
    [wire, masterPeerId, sessionStorageKey, initialHumanErrors],
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

export function RemoteProvider({
  children,
  init,
  masterPeerId,
  sessionStorageKey,
  humanErrors,
}: RemoteProviderProps): ReactElement {
  // TypeScript rules this out for typed callers - the prop is required. It
  // stays because the package is consumed from JavaScript too, and connecting
  // to `undefined` fails later and less clearly.
  if (!masterPeerId) {
    throw new Error("`masterPeerId` prop required by `RemoteProvider`.");
  }
  const value = useWrcConnection(wireRemote, init, masterPeerId, {
    sessionStorageKey,
    humanErrors,
  });
  return (
    <RemoteContext.Provider value={value}>{children}</RemoteContext.Provider>
  );
}
