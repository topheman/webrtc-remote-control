import prepare from "@webrtc-remote-control/core/remote";

import { makeLogger } from "../../shared/js/common";
import { render } from "./remote.view";

const REMOTE_NAME_LOCAL_STORAGE_KEY = "remote-name";

export function getRemoteNameFromSessionStorage() {
  return sessionStorage.getItem(REMOTE_NAME_LOCAL_STORAGE_KEY) || "";
}

export function setRemoteNameToSessionStorage(remoteName) {
  sessionStorage.setItem(REMOTE_NAME_LOCAL_STORAGE_KEY, remoteName);
}

async function init() {
  const { bindConnection, getPeerId } = prepare();

  const initialName = getRemoteNameFromSessionStorage();
  const { showLoader, setConnected, setEvents, setConsoleDisplay, setErrors } =
    render({
      initialName,
    });

  const logger = makeLogger({ onLog: setConsoleDisplay });

  const masterPeerId = window.location.hash.replace(/^#/, "");

  // create your own PeerJS connection
  const peer = new Peer(getPeerId());
  peer.on("open", (peerId) => {
    showLoader(false);
    setConnected(true);
    logger.log({
      event: "open",
      comment: "Remote connected",
      payload: { id: peerId },
    });
  });
  peer.on("error", (error) => {
    showLoader(false);
    setConnected(false);
    setErrors([`An error of type "${error.type}" occured.`]);
    logger.error({ event: "error", error });
  });

  // bind webrtc-remote-control to `peer`
  const wrcRemote = await bindConnection(peer, masterPeerId);
  wrcRemote.on("remote.disconnect", (payload) => {
    logger.log({ event: "remote.disconnect", payload });
  });
  wrcRemote.on("remote.reconnect", (payload) => {
    logger.log({ event: "remote.reconnect", payload });
    if (initialName) {
      wrcRemote.send({ type: "REMOTE_SET_NAME", name: initialName });
    }
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
