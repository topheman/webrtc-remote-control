// eslint-disable-next-line import/no-extraneous-dependencies
import React, { createContext, useEffect, useRef } from "react";
import { master, remote, prepareUtils } from "@webrtc-remote-control/core";

export const MyContext = createContext();

export function WebRTCRemoteControlProvider({
  children,
  sessionStorageKey,
  humanErrors,
  mode,
  masterPeerId,
  init,
}) {
  const allowedMode = ["master", "remote"];
  if (!allowedMode.includes(mode)) {
    throw new Error(
      `Unsupported "${mode}" mode. Only ${allowedMode
        .map((a) => `"${a}"`)
        .join(", ")} accepted.`
    );
  }
  if (mode === "master" && masterPeerId) {
    console.log(typeof masterPeerId);
    throw new Error(
      `\`masterPeerId\` prop not allowed in "master" mode - "${masterPeerId}" was passed.`
    );
  }
  if (mode === "remote" && !masterPeerId) {
    throw new Error(`\`masterPeerId\` prop required in "remote" mode.`);
  }
  const utils = prepareUtils({
    sessionStorageKey,
    humanErrors,
  });
  const providerValue = useRef({ peer: null, api: null });
  function bindEvents(api) {
    api.on("remote.connect", ({ id }) => {
      console.log("remote.connect", id);
    });
    api.on("remote.disconnect", ({ id }) => {
      console.log("remote.disconnect", id);
    });
    api.on("remote.reconnect", ({ id }) => {
      console.log("remote.reconnect", id);
    });
  }
  useEffect(() => {
    providerValue.current.peer = init({
      humanizeError: utils.humanizeError,
      getPeerId: utils.getPeerId,
      isConnectionFromRemote:
        mode === "master" ? utils.isConnectionFromRemote : undefined,
    });
    providerValue.current.peer.on("open", (id) => {
      console.log("open", id);
    });
    switch (mode) {
      case "master":
        master
          .default(utils)
          .bindConnection(providerValue.current.peer)
          .then((wrcApi) => {
            providerValue.current.api = wrcApi;
            bindEvents(providerValue.current.api);
          });
        break;
      case "remote":
        remote
          .default(utils)
          .bindConnection(providerValue.current.peer, masterPeerId)
          .then((wrcApi) => {
            providerValue.current.api = wrcApi;
            bindEvents(providerValue.current.api);
          });
        break;
      default:
        break;
    }
    return () => {
      console.log("cleanup useEffect");
      providerValue.current.peer.disconnect();
    };
  }, [mode, masterPeerId, init, utils]);
  return (
    <MyContext.Provider value={providerValue.current}>
      {children}
    </MyContext.Provider>
  );
}
