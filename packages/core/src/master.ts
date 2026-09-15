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
          // if this is a reconnect from the same peer, replace connection with the latest one
          connections.set(conn.peer, conn);
          conn.on("open", () => {
            ee.emit("remote.connect", { id: conn.peer });
          });
          conn.on("data", (data) => {
            ee.emit("data", { id: conn.peer, from: "remote" }, data);
          });
          conn.on("close", () => {
            connections.delete(conn.peer);
            ee.emit("remote.disconnect", { id: conn.peer });
          });
        });
      });
    },
  };
}
