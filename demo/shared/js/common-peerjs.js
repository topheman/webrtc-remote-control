export function getPeerjsConfig() {
  // when using the local signaling server
  if (import.meta.env.VITE_USE_LOCAL_PEER_SERVER) {
    return {
      host: "localhost",
      port: 9000,
      path: "/myapp",
    };
  }
  // default case, we use the alternate server since on some mobile carriers (orange - France)
  // the default host 0.peerjs.com hangs on forever - see https://github.com/peers/peerjs/issues/948#issuecomment-1107437915
  // todo what if this fix triggers the same kind of problem on other carriers ? implement some kind of balancing ?
  return {
    host: "0.peerjs.com",
    port: 443,
    path: "/",
  };
}
