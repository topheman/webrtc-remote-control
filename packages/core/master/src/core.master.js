/* eslint-disable import/no-relative-packages,import/no-extraneous-dependencies */
import EventEmitter from "eventemitter3";

import { isMessagePrivate } from "../../shared/common";

import { usePollingData } from "./core.master.utils";

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
        const connections = [];
        const { pushPollingData, startHandlePollingData, pollingData } =
          usePollingData();
        startHandlePollingData();
        window.pollingData = pollingData; // todo remove
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
          if (connections.findIndex(({ peer: id }) => id === conn.peer) > -1) {
            const index = connections.findIndex(
              ({ peer: id }) => id === conn.peer
            );
            connections[index] = conn;
          } else {
            connections.push(conn);
          }
          // use peer as key and array as a reference we can mutate
          pushPollingData(conn.peer);
          console.log("connections", connections);
          conn.on("open", () => {
            pushPollingData(conn.peer, { payload: new Date() });
            ee.emit("remote.connect", { id: conn.peer });
          });
          conn.on("data", (data) => {
            if (isMessagePrivate(data)) {
              if (data.action === "POLLING") {
                pushPollingData(conn.peer, data);
                // console.log(data.payload, conn.peer);
              }
              return;
            }
            ee.emit("data", { id: conn.peer, from: "remote" }, data);
          });
          conn.on("close", () => {
            // todo remote conn from connections array ?
            ee.emit("remote.disconnect", { id: conn.peer });
          });
        });
      });
    },
  };
}
