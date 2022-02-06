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
  const ee = eventEmitter();
  const connections = [];
  peer.on("open", (peerId) => {
    setMasterPeerIdToLocalStorage(peerId);
    console.info(`Peer object created, ${JSON.stringify({ peerId })}`);
  });
  peer.on("connection", (conn) => {
    connections.push(conn);
    console.info(`Data connection opened with remote ${conn.peer}`);
    console.log("connections", peer.connections);
    ee.emit("remoteConnect", { id: conn.peer });
    conn.on("data", (data) => {
      console.log({ data }, conn);
      ee.emit("data", { id: conn.peer }, data);
      // do some event handling
    });
  });
  peer.on("error", (error) => {
    console.error(error);
  });
  peer.on("disconnected", (e) => {
    console.log("disconnected", e);
  });
  return {
    connections,
    on: ee.on,
    off: ee.off,
  };
}
