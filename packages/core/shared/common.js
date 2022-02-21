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
