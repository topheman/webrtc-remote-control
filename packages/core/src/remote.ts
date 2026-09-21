import EventEmitter from "eventemitter3";
import type { DataConnection, Peer } from "peerjs";

import {
  makeConnectionFilterUtilities,
  makeReconnectNotice,
  reconnectDelay,
} from "./common.js";
import type {
  GetPeerIdType,
  HumanizableError,
  HumanizeErrorType,
  ReconnectingPayload,
  SetPeerIdToSessionStorageType,
} from "./common.js";

/**
 * The type of the predicate `prepare` hands out. Declared here rather than in
 * `common.ts` because it is the remote side's alone: a master does not
 * reconnect, so nothing on that side can produce the errors this describes.
 */
export type IsIgnorableErrorType = (error: HumanizableError) => boolean;

export { makeReconnectNotice, prepareUtils } from "./common.js";

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
  "remote.reconnecting": (payload: ReconnectingPayload) => void;
  "remote.reconnect": (payload: { id: string }) => void;
  data: (payload: { from: "master" }, data: unknown) => void;
}

export interface WrcRemote {
  send(payload: unknown): void;
  on: EventEmitter<WrcRemoteEvents>["on"];
  off: EventEmitter<WrcRemoteEvents>["off"];
}

export interface PrepareRemoteUtils<TReconnecting = string, TStalled = string> {
  humanizeError: HumanizeErrorType;
  getPeerId: GetPeerIdType;
  setPeerIdToSessionStorage: SetPeerIdToSessionStorageType;
  /**
   * Optional, because `prepare` is public and a caller may hand in a
   * hand-rolled bundle rather than the one `prepareUtils` builds. When it is
   * absent the default factory fills it in, so what `prepare` returns always
   * has one - a consumer of the remote side should never have to check.
   */
  reconnectNotice?: (payload: ReconnectingPayload) => TReconnecting | TStalled;
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

export default function prepare<TReconnecting = string, TStalled = string>({
  humanizeError,
  getPeerId,
  setPeerIdToSessionStorage,
  // Both parameters are inferred from the `reconnectNotice` that was passed,
  // so this fallback is only reached while they are still their `string`
  // default - the same reasoning the built-in messages carry in `common.ts`.
  reconnectNotice = makeReconnectNotice() as (
    payload: ReconnectingPayload,
  ) => TReconnecting | TStalled,
}: PrepareRemoteUtils<TReconnecting, TStalled>) {
  /**
   * Whether the retry loop below is in flight. It lives here, in `prepare`'s
   * closure rather than inside `bindConnection`, so `isIgnorableError` exists
   * before any peer does: a consumer registers `peer.on("error", ...)` before
   * awaiting `bindConnection`, and a first-connection failure arrives in
   * exactly that window. `false` until the first retry starts is also the
   * right answer there - a first connection is never retried.
   */
  let reconnecting = false;
  return {
    humanizeError,
    getPeerId,
    /**
     * Passed straight through, the way `humanizeError` is. The remote side is
     * the one that reconnects to its master, not the other way round, so this
     * is where the notice belongs - `master.default` has no use for it.
     */
    reconnectNotice,
    /**
     * Whether an error the consumer just received from their `Peer` is one this
     * library provoked, and so safe not to show anyone.
     *
     * Every retry that loses its race to the master re-registering makes peerjs
     * emit `peer-unavailable`. `humanizeError` turns those into advice to
     * reload: wrong mid-recovery, right on a first connection - which is never
     * retried. Only this library knows which of the two is happening.
     *
     * Nothing is intercepted; the consumer still gets every event and still
     * writes the `return`. It is `true` for `peer-unavailable` alone, and it
     * cannot tell which peer an error is about, since peerjs carries that id
     * only in the message text - so a page whose `Peer` also connects to ids
     * this library does not manage should not call it.
     */
    isIgnorableError(error: HumanizableError): boolean {
      return reconnecting && error.type === "peer-unavailable";
    },
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
            reconnecting = false;
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
          // Set before the event is emitted rather than after, so a handler
          // that reacts synchronously already sees the loop as running.
          reconnecting = true;
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
          // Close the connection when the page goes away, so the master hears
          // about it at once instead of waiting for the data channel to time
          // out on its own.
          //
          // Retiring the generation first is what keeps this from fighting the
          // reconnection loop: `close()` makes peerjs emit "close", and
          // without this the handler would read its own teardown as an outage
          // and start retrying on a page that is already unloading.
          const onBeforeUnloadCloseConnection = () => {
            generation += 1;
            clearRetryTimer();
            conn?.close();
          };
          window.addEventListener(
            "beforeunload",
            onBeforeUnloadCloseConnection,
          );
        });
      });
    },
  };
}
