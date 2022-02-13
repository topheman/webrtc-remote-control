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
      console.info(`Peer object created, ${JSON.stringify({ peerId })}`);
      res(wrcMaster);
    });
    peer.on("connection", (conn) => {
      connections.push(conn);
      ee.emit("remote.connect", { id: conn.peer });
      console.info(`Data connection opened with remote ${conn.peer}`);
      console.log("connections", peer.connections);
      ee.emit("remoteConnect", { id: conn.peer });
      conn.on("data", (data) => {
        console.log({ data }, conn);
        ee.emit("data", { id: conn.peer }, data);
        // do some event handling
      });
      conn.on("close", () => {
        ee.emit("remote.close", { id: conn.peer });
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
