import React, { createContext, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { master, prepareUtils, remote } from "@webrtc-remote-control/core";
import type {
  GetPeerIdType,
  HumanizeErrorType,
  IsConnectionFromRemoteType,
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

/** The utilities the `init` callback is handed. */
export interface ProviderInitOptions {
  humanizeError: HumanizeErrorType;
  getPeerId: GetPeerIdType;
  /** Master mode only: the remote side has no use for the filter. */
  isConnectionFromRemote?: IsConnectionFromRemoteType;
}

export interface ProviderProps {
  children: ReactNode;
  sessionStorageKey?: string;
  humanErrors?: MakeHumanizeErrorOptions;
  mode: "master" | "remote";
  masterPeerId?: string;
  init: (options: ProviderInitOptions) => PeerInstance;
}

/**
 * What the provider puts on the context, and what `usePeer` spreads into its
 * result. Everything but `mode` and `masterPeerId` is filled in by the effect,
 * so the value starts out mostly empty and is replaced once the peer exists.
 */
export interface WebRTCRemoteControlContextValue {
  peer: PeerInstance | null;
  promise: Promise<
    MasterBindConnectionApiResolved | RemoteBindConnectionApiResolved
  > | null;
  mode: "master" | "remote";
  masterPeerId?: string;
  humanizeError?: HumanizeErrorType;
  isConnectionFromRemote?: IsConnectionFromRemoteType;
}

export const MyContext = createContext<
  WebRTCRemoteControlContextValue | undefined
>(undefined);

export function Provider({
  children,
  sessionStorageKey,
  humanErrors,
  mode,
  masterPeerId,
  init,
}: ProviderProps): ReactElement | null {
  const allowedMode = ["master", "remote"] as const;
  // TypeScript rules these three out for typed callers. They stay because the
  // package is consumed from JavaScript too, and the messages are what the
  // behavioral tests assert.
  if (!allowedMode.includes(mode)) {
    throw new Error(
      `Unsupported "${mode}" mode. Only ${allowedMode
        .map((a) => `"${a}"`)
        .join(", ")} accepted.`,
    );
  }
  if (mode === "master" && masterPeerId) {
    throw new Error(
      `\`masterPeerId\` prop not allowed in "master" mode - "${masterPeerId}" was passed.`,
    );
  }
  if (mode === "remote" && !masterPeerId) {
    throw new Error(`\`masterPeerId\` prop required in "remote" mode.`);
  }
  /**
   * `init` and `humanErrors` are read by the connection effect but deliberately
   * kept out of its dependencies: a caller writing `init={({ getPeerId }) => ...}`
   * inline hands a fresh function every render, and re-running the effect on that
   * would tear the peer down and rebuild it. The connection belongs to a
   * `mode`/`masterPeerId` pair, not to a callback identity, so the latest value is
   * mirrored onto a ref instead. This effect is declared first, so on mount it runs
   * before the one below.
   */
  const initRef = useRef(init);
  const humanErrorsRef = useRef(humanErrors);
  useEffect(() => {
    initRef.current = init;
    humanErrorsRef.current = humanErrors;
  });
  /**
   * The context value is replaced, never mutated: the provider used to hand out a
   * ref's `.current` and write onto it from the effect, which meant consumers had
   * no way to learn the peer had arrived - `usePeer` compensated with a state flag
   * it flipped on a microtask. Setting state here makes the arrival a normal
   * render, and `usePeer` can just wait on the promise it is given.
   */
  const [contextValue, setContextValue] =
    useState<WebRTCRemoteControlContextValue>(() => ({
      peer: null,
      promise: null,
      mode,
      masterPeerId,
    }));
  useEffect(() => {
    // Built here rather than during render: `prepareUtils` returns a fresh object
    // every call, and keeping it out of render keeps it out of the dependencies.
    const utils = prepareUtils({
      sessionStorageKey,
      humanErrors: humanErrorsRef.current,
    });
    const isConnectionFromRemote =
      mode === "master" ? utils.isConnectionFromRemote : undefined;

    // init callback that should return a peer instance like:
    // `({ getPeerId }) => new Peer(getPeerId())`
    const peer = initRef.current({
      humanizeError: utils.humanizeError,
      getPeerId: utils.getPeerId,
      isConnectionFromRemote,
    });

    // The two sides take different arguments, so typing them forces the branch
    // apart. `masterPeerId` is guaranteed in remote mode by the guard above, which
    // TypeScript cannot carry into this callback.
    const promise =
      mode === "master"
        ? master.default(utils).bindConnection(peer)
        : remote.default(utils).bindConnection(peer, masterPeerId as string);
    // start resolving the promise as soon as possible (it will be used in `usePeer`)
    void promise.then(() => {});

    setContextValue({
      peer,
      promise,
      mode,
      masterPeerId,
      humanizeError: utils.humanizeError,
      isConnectionFromRemote,
    });
    return () => {
      peer.disconnect();
    };
  }, [mode, masterPeerId, sessionStorageKey]);
  return (
    <MyContext.Provider value={contextValue}>{children}</MyContext.Provider>
  );
}
