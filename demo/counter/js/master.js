import { connect, getPeerjsID } from "@webrtc-remote-control/core/master";

import { counterReducer, globalCount } from "./master.logic";
import { render } from "./master.view";

async function init() {
  const {
    showLoader,
    enableButtonOpenRemote,
    setPeerId,
    setRemoteList,
    setGlobalCounter,
    // setErrors,
    // setConsoleDisplay,
  } = render();

  let counters = [];

  // create your own PeerJS connection
  const peer = new Peer(getPeerjsID());
  peer.on("open", (peerId) => {
    setPeerId(peerId);
    showLoader(false);
  });
  peer.on("error", () => {
    setPeerId(null);
    showLoader(false);
    enableButtonOpenRemote(false);
  });

  // bind webrtc-remote-control to `peer`
  const wrcMaster = await connect(peer);
  wrcMaster.on("remote.connect", ({ id }) => {
    console.log("master - remote.connect", id);
    counters = [...counters, { counter: 0, peerId: id }];
    setRemoteList(counters);
  });
  wrcMaster.on("data", ({ id }, data) => {
    console.log("on data", id, data);
    console.log(counters);
    counters = counterReducer(counters, data, id);
    setRemoteList(counters);
    setGlobalCounter(globalCount(counters));
  });
  // peer.on("connection", (conn) => {
  //   console.log("master on.connection");
  //   counters = [...counters, { counter: 0, peerId: conn.peer }];
  //   setRemoteList(counters);
  //   conn.on("data", (...data) => {
  //     console.log(conn.peer, data);
  //   });
  // });
  // peer.on("data", (...data) => {
  //   console.log(data);
  // });
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
