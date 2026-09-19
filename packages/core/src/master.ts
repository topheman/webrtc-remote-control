import EventEmitter from "eventemitter3";
import type { DataConnection, Peer } from "peerjs";

import type {
  GetPeerIdType,
  HumanizeErrorType,
  IsConnectionFromRemoteType,
  SetPeerIdToSessionStorageType,
} from "./common.js";

export { prepareUtils } from "./common.js";

/**
 * The events a master emits. Typing them is what makes `on` and `off` tell you
 * the payload of the event you subscribed to; the pre-TypeScript declarations
 * exposed eventemitter3's untyped signatures instead.
 */
export interface WrcMasterEvents {
  "remote.connect": (payload: { id: string }) => void;
  "remote.disconnect": (payload: { id: string }) => void;
  data: (payload: { id: string; from: "remote" }, data: unknown) => void;
}

export interface WrcMaster {
  // peerjs's `DataConnection.send` resolves asynchronously when chunking is
  // involved, hence the promise in the union. `null` means no such connection.
  sendTo(id: string, payload: unknown): void | Promise<void> | null;
  sendAll(payload: unknown): void;
  on: EventEmitter<WrcMasterEvents>["on"];
  off: EventEmitter<WrcMasterEvents>["off"];
}

export interface PrepareMasterUtils {
  humanizeError: HumanizeErrorType;
  isConnectionFromRemote: IsConnectionFromRemoteType;
  getPeerId: GetPeerIdType;
  setPeerIdToSessionStorage: SetPeerIdToSessionStorageType;
}

export default function prepare({
  humanizeError,
  isConnectionFromRemote,
  getPeerId,
  setPeerIdToSessionStorage,
}: PrepareMasterUtils) {
  return {
    humanizeError,
    isConnectionFromRemote,
    getPeerId,
    bindConnection(peer: Peer): Promise<WrcMaster> {
      return new Promise((res) => {
        const ee = new EventEmitter<WrcMasterEvents>();
        const connections = new Map<string, DataConnection>();
        const wrcMaster: WrcMaster = {
          sendTo(id, payload) {
            const conn = connections.get(id);
            if (conn) {
              return conn.send(payload);
            }
            return null;
          },
          sendAll(payload) {
            [...connections.values()].forEach((conn) => {
              conn.send(payload);
            });
          },
          on: ee.on.bind(ee),
          off: ee.off.bind(ee),
        };
        peer.on("open", (peerId) => {
          setPeerIdToSessionStorage(peerId);
          res(wrcMaster);
        });
        peer.on("connection", (conn) => {
          // we don't track the connections made by the user directly using `peer.connect`
          if (!isConnectionFromRemote(conn)) {
            return;
          }
          // A reconnect under the same peer id supersedes whatever this master
          // was still holding for it. Closing that connection now, rather than
          // waiting for peerjs's own failure detection to notice it went
          // stale, keeps `remote.disconnect` prompt instead of racing an
          // indeterminate amount of time behind the reconnection that caused
          // it.
          connections.get(conn.peer)?.close();
          connections.set(conn.peer, conn);
          // Whether this connection has been announced with `remote.connect`.
          // The contract is one `remote.connect` per `remote.disconnect` for a
          // given id, and it is enforced here rather than trusted to peerjs:
          // a connection this master no longer holds must not announce
          // itself, and one that already did must not do it again.
          let announced = false;
          conn.on("open", () => {
            if (announced || connections.get(conn.peer) !== conn) {
              return;
            }
            announced = true;
            ee.emit("remote.connect", { id: conn.peer });
          });
          conn.on("data", (data) => {
            ee.emit("data", { id: conn.peer, from: "remote" }, data);
          });
          conn.on("close", () => {
            // A connection already superseded in the map must not evict its
            // replacement, nor announce a disconnect for a peer that never
            // actually left - this is what a stale connection's belated
            // close would otherwise do.
            if (connections.get(conn.peer) !== conn) {
              return;
            }
            connections.delete(conn.peer);
            if (!announced) {
              return;
            }
            ee.emit("remote.disconnect", { id: conn.peer });
          });
        });
      });
    },
  };
}
