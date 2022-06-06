/* eslint-disable import/no-relative-packages,import/no-extraneous-dependencies */
import EventEmitter from "eventemitter3";

export { prepareUtils } from "../../shared/common";

export default function prepare({
  humanizeError,
  isConnectionFromRemote,
  getPeerId,
  setPeerIdToSessionStorage,
}) {
  return {
    humanizeError,
    isConnectionFromRemote,
    getPeerId,
    bindConnection(peer) {
      return new Promise((res) => {
        const ee = new EventEmitter();
        const connections = new Map();
        const wrcMaster = {
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
            console.log("connections", connections);
          });
          conn.on("data", (data) => {
            ee.emit("data", { id: conn.peer, from: "remote" }, data);
          });
          conn.on("close", () => {
            connections.delete(conn.peer);
            ee.emit("remote.disconnect", { id: conn.peer });
            console.log("connections", connections);
          });
        });
      });
    },
  };
}
