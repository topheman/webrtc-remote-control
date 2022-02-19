/* eslint-disable import/no-relative-packages */
import { eventEmitter } from "../../shared/event-emitter";

const MASTER_PEER_ID_SESSION_STORAGE_KEY =
  "webrtc-remote-control-master-peer-id";

function getPeerjsID() {
  return sessionStorage.getItem(MASTER_PEER_ID_SESSION_STORAGE_KEY);
}

function setMasterPeerIdToSessionStorage(masterPeerId) {
  sessionStorage.setItem(MASTER_PEER_ID_SESSION_STORAGE_KEY, masterPeerId);
}

export default function prepare() {
  return {
    getPeerjsID,
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
          setMasterPeerIdToSessionStorage(peerId);
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
