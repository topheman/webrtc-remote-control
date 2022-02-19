export function makeStoreAccessor(
  storageKey = "webrtc-remote-control-peer-id"
) {
  return {
    getPeerId() {
      return sessionStorage.getItem(storageKey);
    },
    setPeerIdToSessionStorage(peerId) {
      sessionStorage.setItem(storageKey, peerId);
    },
  };
}
