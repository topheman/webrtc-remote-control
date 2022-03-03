export function makeStoreAccessor(
  sessionStorageKey = "webrtc-remote-control-peer-id"
) {
  return {
    getPeerId() {
      return sessionStorage.getItem(sessionStorageKey);
    },
    setPeerIdToSessionStorage(peerId) {
      sessionStorage.setItem(sessionStorageKey, peerId);
    },
  };
}

export function makeConnectionFilterUtilities() {
  const connMetadata = "from-webrtc-remote-control";
  return {
    isConnectionFromRemote(conn) {
      return conn.metadata === connMetadata;
    },
    connMetadata,
  };
}

/**
 * Pass mapping of error.type / message
 * You can pass `default` key a function that accepts an `error` and returns a string
 */
export function makeHumanizeError(overrideMapping = {}) {
  const mapping = {
    "browser-incompatible":
      "Your browser doesn't support WebRTC features, please try with a recent browser.",
    disconnected:
      "You are disconnected and can't make any more peer connection, please reload.",
    network: "It seems you're experimenting some network problems ...",
    "peer-unavailable":
      "The peer you were connected to seems to have lost connection, try to reload it.",
    default: (error) => `An error occured (type: "${error.type}")`,
    ...overrideMapping,
  };
  return function humanizeError(error) {
    const humanError =
      mapping[error.type] ||
      (typeof mapping.default === "function"
        ? mapping.default(error)
        : mapping.default);
    return humanError;
  };
}

export function prepareUtils({ sessionStorageKey, humanErrors } = {}) {
  const humanizeError = makeHumanizeError(humanErrors);
  const { isConnectionFromRemote } = makeConnectionFilterUtilities();
  const { getPeerId, setPeerIdToSessionStorage } =
    makeStoreAccessor(sessionStorageKey);
  return {
    humanizeError,
    isConnectionFromRemote,
    getPeerId,
    setPeerIdToSessionStorage,
  };
}
