import prepare, { prepareUtils } from "@webrtc-remote-control/core/remote";

import { getPeerjsConfig } from "../../shared/js/common-peerjs";
import { makeLogger } from "../../shared/js/common";
import "../../shared/js/animate"; // todo
import { render } from "./remote.view";

const REMOTE_NAME_LOCAL_STORAGE_KEY = "remote-name";

export function getRemoteNameFromSessionStorage() {
  return sessionStorage.getItem(REMOTE_NAME_LOCAL_STORAGE_KEY) || "";
}

export function setRemoteNameToSessionStorage(remoteName) {
  sessionStorage.setItem(REMOTE_NAME_LOCAL_STORAGE_KEY, remoteName);
}

async function init() {
  const { bindConnection, getPeerId, humanizeError } = prepare(prepareUtils());

  const initialName = getRemoteNameFromSessionStorage();
  const { showLoader, setConnected, setEvents, setConsoleDisplay, setErrors } =
    render({
      initialName,
    });

  const logger = makeLogger({ onLog: setConsoleDisplay });

  const masterPeerId = window.location.hash.replace(/^#/, "");

  // create your own PeerJS connection
  const peer = new Peer(
    getPeerId(),
    // line bellow is optional - you can rely on the signaling server exposed by peerjs
    getPeerjsConfig()
  );
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
    setErrors([humanizeError(error)]);
    logger.error({ event: "error", error });
  });
  peer.on("disconnected", (id) => {
    showLoader(false);
    setConnected(false);
    logger.error({ event: "disconnected", id });
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
  wrcRemote.on("data", (_, data) => {
    logger.log({ event: "data", data });
    if (data.type === "PING") {
      window?.frameworkIconPlay();
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
