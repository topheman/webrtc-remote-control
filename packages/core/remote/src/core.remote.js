/* eslint-disable import/no-relative-packages,import/no-extraneous-dependencies */
import EventEmitter from "eventemitter3";

import { makeConnectionFilterUtilities } from "../../shared/common";

import { startLongPolling } from "./core.remote.utils";

export { prepareUtils } from "../../shared/common";

function makePeerConnection(peer, masterPeerId, ee, onConnectionOpened) {
  const { connMetadata } = makeConnectionFilterUtilities();
  // to ensure connections with iOs, must use json serialization
  const conn = peer.connect(masterPeerId, {
    serialization: "json",
    metadata: connMetadata, // will let us identify which connections are managed by the package / by the user
  });
  conn.on("open", () => {
    if (typeof onConnectionOpened === "function") {
      onConnectionOpened();
    }
  });
  conn.on("data", (data) => {
    ee.emit("data", { from: "master" }, data);
  });
  return conn;
}

export default function prepare({
  humanizeError,
  getPeerId,
  setPeerIdToSessionStorage,
  // todo accept polling = POLLING_ENABLED = true (handle polling=true in master when false on remote)
}) {
  return {
    humanizeError,
    getPeerId,
    bindConnection(peer, masterPeerId) {
      return new Promise((res) => {
        let conn = null;
        const ee = new EventEmitter();
        const wrcRemote = {
          send(payload) {
            if (conn) {
              conn.send(payload);
            } else {
              // eslint-disable-next-line no-console
              console.warning("You called `send` with no connection");
            }
          },
          on: ee.on.bind(ee),
          off: ee.off.bind(ee),
        };
        const createPeerConnectionWithReconnectOnClose = (
          onConnectionOpened
        ) => {
          conn = null;
          conn = makePeerConnection(peer, masterPeerId, ee, onConnectionOpened);
          const cancelLongPolling = startLongPolling(conn);
          conn.on("close", () => {
            cancelLongPolling();
            ee.emit("remote.disconnect", { id: peer.id });
            createPeerConnectionWithReconnectOnClose(() => {
              ee.emit("remote.reconnect", { id: peer.id });
            });
          });
        };
        peer.on("open", (peerId) => {
          setPeerIdToSessionStorage(peerId);
          createPeerConnectionWithReconnectOnClose(() => res(wrcRemote));
          conn.on("error", (e) => {
            // todo emit some error ? same on master ?
            console.log("conn.error", e);
          });
          // ensure to disconnect remote when the page is closed
          const onBeforeUnloadPeerDisconnect = () => {
            if (conn && conn.disconnect) {
              conn.disconnect();
            }
          };
          window.addEventListener("beforeunload", onBeforeUnloadPeerDisconnect);
          // todo refactor 👇
          window.addEventListener("visibilitychange", () => {
            if (conn) {
              conn.send({
                type: "VISIBILITY_CHANGE",
                "document.hidden": document.hidden,
              });
              // todo should send a "PAUSE" message
            }
          });
        });
      });
    },
  };
}
