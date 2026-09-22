import { useState } from "react";

import { MasterProvider, RemoteProvider } from "@webrtc-remote-control/react";
import type { GetPeerIdType } from "@webrtc-remote-control/core";

import { Peer, getPeerjsConfig } from "../../shared/js/common-peerjs";

import Master from "./Master";
import Remote from "./Remote";
import FooterDisplay from "../../shared/js/components/Footer";

const SESSION_STORAGE_KEY = "webrtc-remote-control-peer-id-react";

/**
 * The same callback on both sides: the two providers hand `init` their own
 * utilities, and this only reads the one they share.
 */
const init = ({ getPeerId }: { getPeerId: GetPeerIdType }) =>
  new Peer(
    // see the note in the vanilla demo - an undefined id means "generate one"
    getPeerId(),
    // line bellow is optional - you can rely on the signaling server exposed by peerjs
    getPeerjsConfig(),
  );

export default function App() {
  // The hash is what tells this page which side it is: a remote is opened from
  // the master's link, which carries the master's peer id as a fragment. It
  // never changes afterwards, so it is read once, in the initializer - reading
  // it from an effect instead cost a second render, and a "Loading ..." frame,
  // on every page load.
  const [mode] = useState<"master" | "remote">(() =>
    window.location.hash ? "remote" : "master",
  );
  return (
    <>
      {mode === "remote" ? (
        <RemoteProvider
          init={init}
          masterPeerId={window.location.hash.replace("#", "")}
          sessionStorageKey={SESSION_STORAGE_KEY}
        >
          <Remote />
        </RemoteProvider>
      ) : (
        <MasterProvider init={init} sessionStorageKey={SESSION_STORAGE_KEY}>
          <Master />
        </MasterProvider>
      )}
      <FooterDisplay from="2022" to={new Date().getFullYear()} />
    </>
  );
}
