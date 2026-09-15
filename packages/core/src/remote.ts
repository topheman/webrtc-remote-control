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
        const createPeerConnectionWithReconnectOnClose = (
          onConnectionOpened?: () => void,
        ) => {
          conn = null;
          conn = makePeerConnection(peer, masterPeerId, ee, onConnectionOpened);
          conn.on("close", () => {
            ee.emit("remote.disconnect", { id: peer.id });
            createPeerConnectionWithReconnectOnClose(() => {
              ee.emit("remote.reconnect", { id: peer.id });
            });
          });
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
