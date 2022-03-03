/* eslint-disable import/no-relative-packages */
import { eventEmitter } from "../../shared/event-emitter";

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
        const ee = eventEmitter();
        const connections = [];
        const wrcMaster = {
          sendTo(id, payload) {
            const conn = connections.find(
              (currentConn) => currentConn.peer === id
            );
            if (conn) {
              return conn.send(payload);
            }
            return null;
          },
          sendAll(payload) {
            connections.forEach((conn) => {
              conn.send(payload);
            });
          },
          on: ee.on,
          off: ee.off,
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
          connections.push(conn);
          conn.on("open", () => {
            ee.emit("remote.connect", { id: conn.peer });
          });
          conn.on("data", (data) => {
            ee.emit("data", { id: conn.peer }, data);
          });
          conn.on("close", () => {
            ee.emit("remote.disconnect", { id: conn.peer });
          });
        });
        peer.on("error", (error) => {
          console.error(error);
        });
        peer.on("disconnected", (e) => {
          console.log("disconnected", e);
        });
      });
    },
  };
}
