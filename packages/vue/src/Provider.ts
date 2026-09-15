import { provide, shallowRef, watchEffect } from "vue";
import type { InjectionKey, ShallowRef } from "vue";
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
export interface ProvideInitOptions {
  humanizeError: HumanizeErrorType;
  getPeerId: GetPeerIdType;
  /** Master mode only: the remote side has no use for the filter. */
  isConnectionFromRemote?: IsConnectionFromRemoteType;
}

export interface ProvideWebRTCRemoteControlOptions {
  masterPeerId?: string;
  sessionStorageKey?: string;
  humanErrors?: MakeHumanizeErrorOptions;
}

/**
 * What the provider puts on the injected ref, and what `usePeer` spreads into
 * its result. The ref is shallow and mutated in place, so everything but `mode`
 * and `masterPeerId` is filled in by the effect rather than at construction.
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

// use Symbol to avoid collision in provide/inject
export const MyContext: InjectionKey<
  ShallowRef<WebRTCRemoteControlContextValue>
> = Symbol("context-webrtc-remote-control");

export function provideWebTCRemoteControl(
  init: (options: ProvideInitOptions) => PeerInstance,
  mode: "master" | "remote",
  {
    masterPeerId,
    sessionStorageKey,
    humanErrors,
  }: ProvideWebRTCRemoteControlOptions = {},
): void {
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
  const utils = prepareUtils({
    sessionStorageKey,
    humanErrors,
  });
  const providerValue = shallowRef<WebRTCRemoteControlContextValue>({
    peer: null,
    promise: null,
    mode,
    masterPeerId,
  });
  // expose providerValue so that it can be injected inside the hook
  provide(MyContext, providerValue);

  watchEffect((onCleanup) => {
    providerValue.value.mode = mode;
    providerValue.value.humanizeError = utils.humanizeError;
    if (mode === "master") {
      providerValue.value.isConnectionFromRemote = utils.isConnectionFromRemote;
    }

    // init callback that should return a peer instance like:
    // `({ getPeerId }) => new Peer(getPeerId())`
    const peer = init({
      humanizeError: utils.humanizeError,
      getPeerId: utils.getPeerId,
      isConnectionFromRemote:
        mode === "master" ? utils.isConnectionFromRemote : undefined,
    });
    providerValue.value.peer = peer;

    // Before the port this was one expression, and it passed
    // `remote ? masterPeerId : undefined` as the second argument. `remote` is an
    // imported module, so that test was always true and the argument was always
    // `masterPeerId` - harmless, because master mode guarantees it is undefined
    // and master's `bindConnection` ignores a second argument anyway. The two
    // sides take different arguments, so typing them forces the branch apart;
    // what reaches peerjs is unchanged. `masterPeerId` is guaranteed here by the
    // guard above, which TypeScript cannot carry into this callback.
    providerValue.value.promise =
      mode === "master"
        ? master.default(utils).bindConnection(peer)
        : remote.default(utils).bindConnection(peer, masterPeerId as string);
    // start resolving the promise as soon as possible (it will be used in `usePeer`)
    void providerValue.value.promise.then(() => {});
    // register cleanup
    onCleanup(() => {
      // The ref itself is never reassigned, so this guard is always true. It is
      // preserved as written; `peer` is the instance built just above.
      if (providerValue.value) {
        peer.disconnect();
      }
    });
  });
}
