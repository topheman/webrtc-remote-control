// eslint-disable-next-line import/no-extraneous-dependencies
import React, { createContext, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { master, remote, prepareUtils } from "@webrtc-remote-control/core";

export const MyContext = createContext();

export function Provider({
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
  const providerValue = useRef({
    peer: null,
    promise: null,
    mode,
    masterPeerId,
  });
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
    providerValue.current.mode = mode;
    providerValue.current.masterPeerId = masterPeerId;
    providerValue.current.peer = init({
      humanizeError: utils.humanizeError,
      getPeerId: utils.getPeerId,
      isConnectionFromRemote:
        mode === "master" ? utils.isConnectionFromRemote : undefined,
    });
    providerValue.current.peer.on("open", (id) => {
      console.log("open", id);
    });
    providerValue.current.promise = (mode === "master" ? master : remote)
      .default(utils)
      .bindConnection(
        providerValue.current.peer,
        remote ? masterPeerId : undefined
      );
    providerValue.current.promise.then((wrcApi) => {
      bindEvents(wrcApi);
    });
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

Provider.propTypes = {
  children: PropTypes.any,
  sessionStorageKey: PropTypes.string,
  humanErrors: PropTypes.object,
  mode: PropTypes.oneOf(["master", "remote"]),
  masterPeerId: PropTypes.string,
  init: PropTypes.func,
};
