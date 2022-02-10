import { remote } from "@webrtc-remote-control/core";
import { hello, connect } from "@webrtc-remote-control/core/remote";

import { createView } from "./remote.view";

console.log("@webrtc-remote-control/core", remote.hello());
console.log("@webrtc-remote-control/core/remote", hello());

function init() {
  // create view based on <template> tag content
  const templateNode = document.importNode(
    document.querySelector("template").content,
    true
  );
  const staticContent = document.querySelector(".static-content");
  const { content, showLoader, setErrors, setConnected } = createView(
    templateNode,
    staticContent,
    {
      onClickPlus: () => console.log("plus"),
      onClickMinus: () => console.log("minus"),
    }
  );
  document.querySelector("#content").innerHTML = "";
  document.querySelector("#content").appendChild(content);

  const masterPeerId = window.location.hash.replace(/^#/, "");
  // eslint-disable-next-line no-undef
  const peer = new Peer();
  const { conn, on } = connect(peer, masterPeerId);
  window.conn = conn;
  on("connectionReady", (connection) => {
    showLoader(false);
    setConnected(false);
    setErrors(["Some fake error"]);
    console.log("connectionReady", connection);
    setTimeout(() => {
      connection.send("Yolo");
      connection.send("Yolo");

      setConnected(true);
    }, 1000);
  });
}
init();
