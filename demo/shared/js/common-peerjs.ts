import { Peer as PeerJs } from "peerjs";
import type { PeerOptions } from "peerjs";

// peerjs declares three constructor overloads - `()`, `(options)` and
// `(id: string, options?)` - and none of them admits an absent id alongside
// options. Its implementation does: it treats any falsy id as "allocate me one
// from the brokering server", which is exactly what core's `getPeerId` returns
// on a first visit, and every demo passes `getPeerjsConfig()` as the second
// argument. Declaring the missing overload here, once, is what keeps
// `new Peer(getPeerId(), getPeerjsConfig())` from having to assert the empty
// case away at every call site.
export const Peer = PeerJs as typeof PeerJs & {
  new (id: string | undefined, options?: PeerOptions): PeerJs;
};

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
