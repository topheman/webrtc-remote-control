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
