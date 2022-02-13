/* eslint-disable import/no-relative-packages */
import { someUtil } from "../../shared/common";
import { eventEmitter } from "../../shared/event-emitter";

export function hello() {
  return {
    type: "remote",
    message: someUtil("remote"),
    mode: process.env.NODE_ENV !== "production" ? "development" : "production",
  };
}

const REMOTE_PEER_ID_SESSION_STORAGE_KEY = "remote-peer-id";

export function getPeerjsID() {
  return sessionStorage.getItem(REMOTE_PEER_ID_SESSION_STORAGE_KEY);
}

function setRemoteNameToSessionStorage(remotePeerId) {
  sessionStorage.setItem(REMOTE_PEER_ID_SESSION_STORAGE_KEY, remotePeerId);
}

function makePeerConnection(peer, masterPeerId, { emit }, onConnectionOpened) {
  // to ensure connections with iOs, must use json serialization
  const conn = peer.connect(masterPeerId, { serialization: "json" });
  // send a disconnect message to master when reloading/closing
  const onBeforeUnload = () => {
    // todo tell the master to disconnect the remote
  };
  // make sure to remove a previous added event to prevent double trigger
  window.removeEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("beforeunload", onBeforeUnload);
  conn.on("open", () => {
    if (typeof onConnectionOpened === "function") {
      onConnectionOpened();
    }
  });
  conn.on("data", (data) => {
    emit("data", data);
  });
  return conn;
}

export default function prepare() {
  return {
    getPeerjsID,
    bindConnection(peer, masterPeerId) {
      return new Promise((res) => {
        let conn = null;
        const ee = eventEmitter();
        const wrcRemote = {
          send(payload) {
            if (conn) {
              conn.send(payload);
            } else {
              console.warning("You called `send` with no connection");
            }
          },
          on: ee.on,
          off: ee.off,
        };
        peer.on("open", (peerId) => {
          setRemoteNameToSessionStorage(peerId);
          conn = makePeerConnection(peer, masterPeerId, ee, () =>
            res(wrcRemote)
          );
        });
      });
    },
  };
}
