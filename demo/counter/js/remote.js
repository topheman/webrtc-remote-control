import { connect } from "@webrtc-remote-control/core/remote";

import { render } from "./remote.view";

async function init() {
  const { showLoader, setErrors, setConnected, setEvents } = render();

  const masterPeerId = window.location.hash.replace(/^#/, "");

  // create your own PeerJS connection
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

  // bind webrtc-remote-control to `peer`
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
