/* eslint-disable import/no-relative-packages */
import { someUtil } from "../../shared/common";
import { eventEmitter } from "../../shared/event-emitter";

// todo key should be overwritable

const MASTER_PEER_ID_LOCAL_STORAGE_KEY = "master-peer-id";

export function getPeerjsID() {
  return localStorage.getItem(MASTER_PEER_ID_LOCAL_STORAGE_KEY);
}
function setMasterPeerIdToLocalStorage(masterPeerId) {
  localStorage.setItem(MASTER_PEER_ID_LOCAL_STORAGE_KEY, masterPeerId);
}

export function hello() {
  return {
    type: "master",
    message: someUtil("master"),
    mode: process.env.NODE_ENV !== "production" ? "development" : "production",
  };
}

export function connect(peer) {
  return new Promise((res) => {
    const ee = eventEmitter();
    const connections = [];
    const wrcMaster = {
      sendTo(id, payload) {
        const conn = connections.find((currentConn) => currentConn.peer === id);
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
}
