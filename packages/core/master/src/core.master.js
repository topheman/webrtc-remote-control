/* eslint-disable import/no-relative-packages */
import { someUtil } from "../../shared/common";
import { eventEmitter } from "../../shared/event-emitter";

export function hello() {
  return {
    type: "master",
    message: someUtil("master"),
    mode: process.env.NODE_ENV !== "production" ? "development" : "production",
  };
}

export default function prepare(
  { allowMultipleMasters } = { allowMultipleMasters: false }
) {
  const MASTER_PEER_ID_LOCAL_STORAGE_KEY = "master-peer-id";

  // By default, if you have multiple windows of master in the same browser, an error will occur
  const storageManager = allowMultipleMasters ? sessionStorage : localStorage;

  function setMasterPeerIdToLocalStorage(masterPeerId) {
    storageManager.setItem(MASTER_PEER_ID_LOCAL_STORAGE_KEY, masterPeerId);
  }

  return {
    getPeerjsID() {
      return storageManager.getItem(MASTER_PEER_ID_LOCAL_STORAGE_KEY);
    },
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
          setMasterPeerIdToLocalStorage(peerId);
          res(wrcMaster);
        });
        peer.on("connection", (conn) => {
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
