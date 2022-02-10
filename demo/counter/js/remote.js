import { remote } from "@webrtc-remote-control/core";
import { hello, connect } from "@webrtc-remote-control/core/remote";

import { createView } from "./remote.view";

console.log("@webrtc-remote-control/core", remote.hello());
console.log("@webrtc-remote-control/core/remote", hello());

async function init() {
  // create view based on <template> tag content
  const templateNode = document.importNode(
    document.querySelector("template").content,
    true
  );
  const staticContent = document.querySelector(".static-content");
  const { content, showLoader, setErrors, setConnected, setEvents } =
    createView(templateNode, staticContent, {
      initialName: "",
    });
  document.querySelector("#content").innerHTML = "";
  document.querySelector("#content").appendChild(content);

  const masterPeerId = window.location.hash.replace(/^#/, "");
  // eslint-disable-next-line no-undef
  const peer = new Peer();
  peer.on("open", () => {
    showLoader(false);
    setConnected(true);
  });
  peer.on("error", (e) => {
    showLoader(false);
    setConnected(false);
    setErrors([e.message]);
  });
  const wrcRemote = await connect(peer, masterPeerId);
  window.wrcRemote = wrcRemote;

  setEvents({
    onClickPlus() {
      wrcRemote.send({ type: "COUNTER_INCREMENT" });
    },
    onClickMinus() {
      wrcRemote.send({ type: "COUNTER_DECREMENT" });
    },
    onUpdateName() {},
  });
}
init();
