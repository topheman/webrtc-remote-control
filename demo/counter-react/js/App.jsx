/* eslint-disable no-nested-ternary */
import React, { useState, useEffect } from "react";

import { WebRTCRemoteControlProvider } from "@webrtc-remote-control/react";

import { getPeerjsConfig } from "../../shared/js/common-peerjs";

import Master from "./Master";
import Remote from "./Remote";
import FooterDisplay from "../../shared/js/components/Footer";

export default function App() {
  console.log("App render");
  const [mode, setMode] = useState(null);
  useEffect(() => {
    setMode(window.location.hash ? "remote" : "master");
  }, []);
  return (
    <>
      {mode ? (
        <WebRTCRemoteControlProvider
          mode={mode}
          init={({ getPeerId }) =>
            new Peer(
              getPeerId(),
              // line bellow is optional - you can rely on the signaling server exposed by peerjs
              getPeerjsConfig()
            )
          }
          masterPeerId={
            (window.location.hash && window.location.hash.replace("#", "")) ||
            null
          }
          sessionStorageKey="webrtc-remote-control-peer-id-react"
        >
          {mode === "remote" ? <Remote /> : <Master />}
        </WebRTCRemoteControlProvider>
      ) : (
        "Loading ..."
      )}
      <FooterDisplay from="2022" to={new Date().getFullYear()} />
    </>
  );
}
