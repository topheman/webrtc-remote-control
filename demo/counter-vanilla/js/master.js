import prepare from "@webrtc-remote-control/core/master";

import { makeLogger } from "./common";
import {
  persistCountersToStorage,
  getCountersFromStorage,
} from "./master.persistance";
import { counterReducer, globalCount } from "./master.logic";
import { render } from "./master.view";

async function init() {
  const { bindConnection, getPeerId } = prepare();

  const {
    showLoader,
    setPeerId,
    setRemoteList,
    setGlobalCounter,
    // setErrors,
    setConsoleDisplay,
  } = render();

  let counters = [];

  const logger = makeLogger({ onLog: setConsoleDisplay });

  // create your own PeerJS connection
  const peer = new Peer(getPeerId());
  peer.on("open", (peerId) => {
    setPeerId(peerId);
    showLoader(false);
    logger.log({
      event: "open",
      comment: "Master connected",
      payload: { id: peerId },
    });
  });
  peer.on("error", (error) => {
    setPeerId(null);
    showLoader(false);
    logger.error({ event: "error", error });
    // todo manage errors
  });

  // bind webrtc-remote-control to `peer`
  const wrcMaster = await bindConnection(peer);
  wrcMaster.on("remote.connect", ({ id }) => {
    const countersFromStorage = getCountersFromStorage();
    logger.log({ event: "remote.connect", payload: { id } });
    counters = [
      ...counters,
      { counter: countersFromStorage?.[id] ?? 0, peerId: id },
    ];
    setRemoteList(counters);
  });
  wrcMaster.on("remote.disconnect", ({ id }) => {
    logger.log({ event: "remote.disconnect", payload: { id } });
    counters = counters.filter(({ peerId }) => peerId !== id);
    setRemoteList(counters);
  });
  wrcMaster.on("data", ({ id }, data) => {
    logger.log({ event: "data", data, id });
    counters = counterReducer(counters, { data, id });
    setRemoteList(counters);
    persistCountersToStorage(counters);
    setGlobalCounter(globalCount(counters));
  });
}
init();