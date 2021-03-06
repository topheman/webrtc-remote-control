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
  useEffect(() => {
    // expose the following on the ref forwarded to the provider
    providerValue.current.mode = mode;
    providerValue.current.humanizeError = utils.humanizeError;
    if (mode === "master") {
      providerValue.current.isConnectionFromRemote =
        utils.isConnectionFromRemote;
    }

    // init callback that should return a peer instance like:
    // `({ getPeerId }) => new Peer(getPeerId())`
    providerValue.current.peer = init({
      humanizeError: utils.humanizeError,
      getPeerId: utils.getPeerId,
      isConnectionFromRemote:
        mode === "master" ? utils.isConnectionFromRemote : undefined,
    });

    providerValue.current.promise = (mode === "master" ? master : remote)
      .default(utils)
      .bindConnection(
        providerValue.current.peer,
        remote ? masterPeerId : undefined
      );
    // start resolving the promise as soon as possible (it will be used in `usePeer`)
    providerValue.current.promise.then(() => {});
    return () => {
      if (providerValue.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        providerValue.current.peer.disconnect();
      }
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
