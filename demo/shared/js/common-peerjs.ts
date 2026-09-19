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
  // default case: PeerJS's own public server, spelled out rather than left to
  // the library's defaults so the `iceServers` above apply.
  return {
    host: "0.peerjs.com",
    port: 443,
    path: "/",
    config: { iceServers: ICE_SERVERS },
  };
}
