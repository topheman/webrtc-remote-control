import prepare from "@webrtc-remote-control/core/remote";

import { makeLogger } from "./common";
import { render } from "./remote.view";

const REMOTE_NAME_LOCAL_STORAGE_KEY = "remote-name";

export function getRemoteNameFromSessionStorage() {
  return sessionStorage.getItem(REMOTE_NAME_LOCAL_STORAGE_KEY) || "";
}

export function setRemoteNameToSessionStorage(remoteName) {
  sessionStorage.setItem(REMOTE_NAME_LOCAL_STORAGE_KEY, remoteName);
}

async function init() {
  const { bindConnection, getPeerjsID } = prepare();

  const initialName = getRemoteNameFromSessionStorage();
  const { showLoader, setConnected, setEvents, setConsoleDisplay } = render({
    initialName,
  });

  const logger = makeLogger(setConsoleDisplay);

  const masterPeerId = window.location.hash.replace(/^#/, "");

  // create your own PeerJS connection
  const peer = new Peer(getPeerjsID());
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
  const wrcRemote = await bindConnection(peer, masterPeerId);
  wrcRemote.on("remote.disconnect", (payload) => {
    logger.log({ event: "remote.disconnect", payload });
  });
  wrcRemote.on("remote.reconnect", (payload) => {
    logger.log({ event: "remote.reconnect", payload });
  });
  if (initialName) {
    wrcRemote.send({ type: "REMOTE_SET_NAME", name: initialName });
  }
  window.wrcRemote = wrcRemote;
  setEvents({
    onClickPlus() {
      wrcRemote.send({ type: "COUNTER_INCREMENT" });
    },
    onClickMinus() {
      wrcRemote.send({ type: "COUNTER_DECREMENT" });
    },
    onUpdateName(name) {
      wrcRemote.send({ type: "REMOTE_SET_NAME", name });
      setRemoteNameToSessionStorage(name);
    },
  });
}
init();
