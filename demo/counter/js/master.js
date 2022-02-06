import { master } from "@webrtc-remote-control/core";
import {
  hello,
  connect,
  getPeerjsID,
} from "@webrtc-remote-control/core/master";

import { createView } from "./master.view";

console.log("@webrtc-remote-control/core", master.hello());
console.log("@webrtc-remote-control/core/hello", hello());

function init() {
  // create view based on <template> tag content
  const templateNode = document.importNode(
    document.querySelector("template").content,
    true
  );
  const staticContent = document.querySelector(".static-content");
  const {
    content,
    showLoader,
    enableButtonOpenRemote,
    setPeerId,
    setRemoteList,
    // setGlobalCounter,
    // setErrors,
    // setConsoleDisplay,
  } = createView(templateNode, staticContent);
  document.querySelector("#content").innerHTML = "";
  document.querySelector("#content").appendChild(content);

  let counters = [];

  // eslint-disable-next-line no-undef
  const peer = new Peer(getPeerjsID());
  const { connections } = connect(peer);
  window.connections = connections;
  peer.on("open", (peerId) => {
    setPeerId(peerId);
    showLoader(false);
  });
  peer.on("error", () => {
    setPeerId(null);
    showLoader(false);
    enableButtonOpenRemote(false);
  });
  peer.on("connection", (conn) => {
    console.log("master on.connection");
    counters = [...counters, { counter: 0, peerId: conn.peer }];
    setRemoteList(counters);
    conn.on("data", (...data) => {
      console.log(conn.peer, data);
    });
  });
  peer.on("data", (...data) => {
    console.log(data);
  });
  // app
  // setTimeout(() => {
  //   showLoader(false);
  // }, 500);
  // setTimeout(() => {
  //   enableButtonOpenRemote(false);
  // }, 1000);
  // setTimeout(() => {
  //   setRemoteList([
  //     { counter: 2, peerId: "AZERTYUIO" },
  //     { counter: -1, peerId: "QSDFGHJ" },
  //     { counter: 10, peerId: "WXCVBN" },
  //   ]);
  // }, 1000);
  // setTimeout(() => {
  //   setGlobalCounter(201);
  // }, 1000);
  // setTimeout(() => {
  //   setErrors(["Some error example"]);
  // }, 1200);
  // setTimeout(() => {
  //   setErrors(null);
  // }, 4000);
  // setTimeout(() => {
  //   setConsoleDisplay([
  //     {
  //       type: "LOG",
  //       level: "info",
  //       payload:
  //         "Data connection opened with remote 1e733687-49f6-4cff-b5c0-48ec82f5586f",
  //       key: 4,
  //     },
  //     {
  //       type: "LOG",
  //       level: "log",
  //       payload: {
  //         peerId: "1e733687-49f6-4cff-b5c0-48ec82f5586f",
  //         type: "REMOTE_CONNECT",
  //       },
  //       key: 3,
  //     },
  //     {
  //       type: "LOG",
  //       level: "log",
  //       payload: {
  //         peerId: "ogpfgw38unp00000",
  //         type: "SIGNAL_OPEN",
  //       },
  //       key: 2,
  //     },
  //     {
  //       type: "LOG",
  //       level: "info",
  //       payload: 'Peer object created, {"peerId":"ogpfgw38unp00000"}',
  //       key: 1,
  //     },
  //   ]);
  // }, 500);
}
init();
