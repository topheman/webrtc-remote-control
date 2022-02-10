import { connect } from "@webrtc-remote-control/core/remote";

import { makeLogger } from "./common";
import { render } from "./remote.view";

async function init() {
  const { showLoader, setConnected, setEvents, setConsoleDisplay } = render();

  const logger = makeLogger(setConsoleDisplay);

  const masterPeerId = window.location.hash.replace(/^#/, "");

  // create your own PeerJS connection
  const peer = new Peer();
  peer.on("open", (peerId) => {
    showLoader(false);
    setConnected(true);
    logger.log(`Remote connected - id: ${peerId}`);
  });
  peer.on("error", (error) => {
    showLoader(false);
    setConnected(false);
    // setErrors([e.message]); // todo
    logger.error({ event: "error", error });
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
