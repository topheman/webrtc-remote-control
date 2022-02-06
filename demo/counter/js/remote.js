import { remote } from "@webrtc-remote-control/core";
import { hello, connect } from "@webrtc-remote-control/core/remote";

console.log("@webrtc-remote-control/core", remote.hello());
console.log("@webrtc-remote-control/core/remote", hello());

function init() {
  const masterPeerId = window.location.hash.replace(/^#/, "");
  // eslint-disable-next-line no-undef
  const peer = new Peer();
  const { conn, on } = connect(peer, masterPeerId);
  window.conn = conn;
  on("connectionReady", (connection) => {
    console.log("connectionReady", connection);
    setTimeout(() => {
      connection.send("Yolo");
      connection.send("Yolo");
    }, 500);
  });
  // setInterval(() => {
  //   console.log("send", { type: "COUNTER_INCREMENT" });
  //   conn.send({ type: "COUNTER_INCREMENT" });
  // }, 1000);
}
init();
