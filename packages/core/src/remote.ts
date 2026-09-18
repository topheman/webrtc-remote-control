import EventEmitter from "eventemitter3";
import type { DataConnection, Peer } from "peerjs";

import { makeConnectionFilterUtilities } from "./common.js";
import type {
  GetPeerIdType,
  HumanizeErrorType,
  SetPeerIdToSessionStorageType,
} from "./common.js";

export { prepareUtils } from "./common.js";

/**
 * The events a remote emits. See the note on `WrcMasterEvents`.
 */
export interface WrcRemoteEvents {
  "remote.disconnect": (payload: { id: string }) => void;
  /**
   * A reconnection attempt is starting. Fired once per attempt, including the
   * immediate one, and never for the first connection - which is not retried,
   * so a `peer-unavailable` there really does mean "wrong or dead master id".
   *
   * This is what lets an application tell "coming back" from "gone". Without
   * it the only signal is `peer-unavailable` on the `Peer`, which says nothing
   * about whether anyone is still trying. `attempt` counts from 1 and
   * `nextDelayMs` is how long this attempt is given before it is abandoned, so
   * an application can show a quiet notice at first and escalate to "try
   * reloading" once the delay has reached its ceiling.
   */
  "remote.reconnecting": (payload: {
    id: string;
    attempt: number;
    nextDelayMs: number;
  }) => void;
  "remote.reconnect": (payload: { id: string }) => void;
  data: (payload: { from: "master" }, data: unknown) => void;
}

export interface WrcRemote {
  send(payload: unknown): void;
  on: EventEmitter<WrcRemoteEvents>["on"];
  off: EventEmitter<WrcRemoteEvents>["off"];
}

export interface PrepareRemoteUtils {
  humanizeError: HumanizeErrorType;
  getPeerId: GetPeerIdType;
  setPeerIdToSessionStorage: SetPeerIdToSessionStorageType;
}

/**
 * How long an attempt that has not opened is given before it is abandoned and
 * retried, doubling each time up to the cap.
 *
 * The first retry after a close stays immediate - that is what it has always
 * been, and it is the one that succeeds whenever the master is still there.
 * The schedule only governs what happens when that attempt lands while the
 * master is unreachable, which is the case that used to leave a remote dead
 * until the user reloaded it.
 */
const RECONNECT_FIRST_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 8000;

function reconnectDelay(attempt: number): number {
  return Math.min(
    RECONNECT_FIRST_DELAY_MS * 2 ** attempt,
    RECONNECT_MAX_DELAY_MS,
  );
}

function makePeerConnection(
  peer: Peer,
  masterPeerId: string,
  ee: EventEmitter<WrcRemoteEvents>,
  onConnectionOpened?: () => void,
): DataConnection {
  const { connMetadata } = makeConnectionFilterUtilities();
  // to ensure connections with iOs, must use json serialization
  const conn = peer.connect(masterPeerId, {
    serialization: "json",
    metadata: connMetadata, // will let us identify which connections are managed by the package / by the user
  });
  conn.on("open", () => {
    if (typeof onConnectionOpened === "function") {
      onConnectionOpened();
    }
  });
  conn.on("data", (data) => {
    ee.emit("data", { from: "master" }, data);
  });
  return conn;
}

export default function prepare({
  humanizeError,
  getPeerId,
  setPeerIdToSessionStorage,
}: PrepareRemoteUtils) {
  return {
    humanizeError,
    getPeerId,
    bindConnection(peer: Peer, masterPeerId: string): Promise<WrcRemote> {
      return new Promise((res) => {
        let conn: DataConnection | null = null;
        const ee = new EventEmitter<WrcRemoteEvents>();
        const wrcRemote: WrcRemote = {
          send(payload) {
            if (!conn) {
              // Before TypeScript this branch called `console.warning`, which
              // does not exist, so it threw an unhelpful TypeError. Sending
              // with no connection is a caller mistake, so it still throws -
              // with a message, and without writing to the console of an app
              // that did not ask for logs.
              throw new Error(
                "webrtc-remote-control: `send` was called before a connection was established",
              );
            }
            conn.send(payload);
          },
          on: ee.on.bind(ee),
          off: ee.off.bind(ee),
        };
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let attempt = 0;
        // Bumped whenever an attempt is superseded. An abandoned attempt still
        // holds listeners on a connection peerjs may yet fire "open" or
        // "close" on, and neither must be mistaken for the current one.
        let generation = 0;

        const clearRetryTimer = () => {
          if (retryTimer !== null) {
            clearTimeout(retryTimer);
            retryTimer = null;
          }
        };

        const createPeerConnectionWithReconnectOnClose = (
          onConnectionOpened?: () => void,
          { retryUntilOpen = false } = {},
        ) => {
          const myGeneration = (generation += 1);
          const isCurrent = () => myGeneration === generation;
          conn = null;
          const attemptConn = makePeerConnection(peer, masterPeerId, ee, () => {
            if (!isCurrent()) {
              return;
            }
            // Connected: the outage is over, so the loop stops and the next
            // one starts from the first delay again.
            clearRetryTimer();
            attempt = 0;
            if (typeof onConnectionOpened === "function") {
              onConnectionOpened();
            }
          });
          conn = attemptConn;
          attemptConn.on("close", () => {
            if (!isCurrent()) {
              return;
            }
            clearRetryTimer();
            attempt = 0;
            ee.emit("remote.disconnect", { id: peer.id });
            reconnect();
          });
          if (retryUntilOpen) {
            retryTimer = setTimeout(() => {
              retryTimer = null;
              // This attempt never opened. Retiring its generation first means
              // the "close" that `close()` triggers is read as the abandonment
              // it is, rather than as a fresh disconnection.
              generation += 1;
              attempt += 1;
              attemptConn.close();
              reconnect();
            }, reconnectDelay(attempt));
          }
        };

        const reconnect = () => {
          ee.emit("remote.reconnecting", {
            id: peer.id,
            attempt: attempt + 1,
            nextDelayMs: reconnectDelay(attempt),
          });
          createPeerConnectionWithReconnectOnClose(
            () => {
              ee.emit("remote.reconnect", { id: peer.id });
            },
            { retryUntilOpen: true },
          );
        };
        peer.on("open", (peerId) => {
          setPeerIdToSessionStorage(peerId);
          createPeerConnectionWithReconnectOnClose(() => res(wrcRemote));
          conn?.on("error", () => {
            // todo emit some error ? same on master ?
          });
          // ensure to disconnect remote when the page is closed
          //
          // KNOWN DEFECT, preserved on purpose: `disconnect` is a method of
          // peerjs's `Peer`, not of `DataConnection`, so this guard has never
          // been true against a real connection and the handler has always
          // been a no-op. TypeScript is what surfaced it. Fixing it means
          // calling `conn.close()`, which really does change what happens on
          // page unload, so it belongs in the follow-up that fixes the other
          // latent bugs rather than in a port meant to change nothing.
          const onBeforeUnloadPeerDisconnect = () => {
            const disconnect = (conn as unknown as { disconnect?: () => void })
              ?.disconnect;
            if (disconnect) {
              disconnect.call(conn);
            }
          };
          window.addEventListener("beforeunload", onBeforeUnloadPeerDisconnect);
        });
      });
    },
  };
}
