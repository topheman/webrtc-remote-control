import type { PeerOptions } from "peerjs";

// PeerJS's own default config pairs this same STUN server with two TURN hosts
// (eu-0.turn.peerjs.com, us-0.turn.peerjs.com) that have no DNS record, so every
// connection attempt logs an ICE failure for them. This demo never needs TURN -
// connections succeed on host candidates - so keep only the STUN entry.
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function getPeerjsConfig(): PeerOptions {
  // when using the local signaling server
  if (import.meta.env.VITE_USE_LOCAL_PEER_SERVER) {
    return {
      host: "localhost",
      port: 9000,
      path: "/myapp",
      config: { iceServers: ICE_SERVERS },
    };
  }
  // default case, we use the alternate server since on some mobile carriers (orange - France)
  // the default host 0.peerjs.com hangs on forever - see https://github.com/peers/peerjs/issues/948#issuecomment-1107437915
  // todo what if this fix triggers the same kind of problem on other carriers ? implement some kind of balancing ?
  return {
    host: "0.peerjs.com",
    port: 443,
    path: "/",
    config: { iceServers: ICE_SERVERS },
  };
}
