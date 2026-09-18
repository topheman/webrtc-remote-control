import prepare, { prepareUtils } from "@webrtc-remote-control/core/remote";
import type { WrcRemote } from "@webrtc-remote-control/core/remote";

import { getPeerjsConfig } from "../../shared/js/common-peerjs";
import { makeLogger } from "../../shared/js/common";
import "../../shared/js/animate"; // todo
import { render } from "./remote.view";

declare global {
  interface Window {
    // The end-to-end suite reaches for this to drive the remote from the page.
    wrcRemote: WrcRemote;
  }
}

const REMOTE_NAME_LOCAL_STORAGE_KEY = "remote-name";

export function getRemoteNameFromSessionStorage(): string {
  return sessionStorage.getItem(REMOTE_NAME_LOCAL_STORAGE_KEY) ?? "";
}

export function setRemoteNameToSessionStorage(remoteName: string): void {
  sessionStorage.setItem(REMOTE_NAME_LOCAL_STORAGE_KEY, remoteName);
}

async function init() {
  const utils = prepareUtils({
    sessionStorageKey: "webrtc-remote-control-peer-id-vanilla",
  });
  const { reconnectNotice } = utils;
  const { bindConnection, getPeerId, humanizeError } = prepare(utils);

  const initialName = getRemoteNameFromSessionStorage();
  const { showLoader, setConnected, setEvents, setConsoleDisplay, setErrors } =
    render({
      initialName,
    });

  const logger = makeLogger({ onLog: setConsoleDisplay });

  const masterPeerId = window.location.hash.replace(/^#/, "");

  // create your own PeerJS connection
  const peer = new Peer(
    // see the note in `master.ts` - a null id means "generate one"
    getPeerId() as string,
    // line bellow is optional - you can rely on the signaling server exposed by peerjs
    getPeerjsConfig(),
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
  // While the retry loop is running, a `peer-unavailable` is just the attempt
  // that lost its race to the master re-registering. The reconnection notice
  // already says so, and `humanizeError` would talk over it with advice to
  // reload - the one thing the user does not need to do.
  let reconnecting = false;
  peer.on("error", (error) => {
    showLoader(false);
    setConnected(false);
    logger.error({ event: "error", error });
    if (reconnecting && error.type === "peer-unavailable") {
      return;
    }
    setErrors([humanizeError(error)]);
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
  wrcRemote.on("remote.reconnecting", (payload) => {
    logger.log({ event: "remote.reconnecting", payload });
    reconnecting = true;
    setErrors([reconnectNotice(payload)]);
  });
  wrcRemote.on("remote.reconnect", (payload) => {
    logger.log({ event: "remote.reconnect", payload });
    reconnecting = false;
    // The `peer-unavailable` that a reconnection attempt loses its race to left
    // the controls disabled and the error on screen. Now that the retry loop
    // gets far enough to come back, that state has to be cleared - otherwise a
    // reconnected remote looks exactly like a dead one.
    setConnected(true);
    setErrors([]);
    if (initialName) {
      wrcRemote.send({ type: "REMOTE_SET_NAME", name: initialName });
    }
  });
  wrcRemote.on("data", (_, data) => {
    logger.log({ event: "data", data });
    if ((data as { type?: string }).type === "PING") {
      window.frameworkIconPlay();
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
void init();
