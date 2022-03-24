/* eslint-disable no-nested-ternary */
import React, { useState, useEffect } from "react";

import { WebRTCRemoteControlProvider } from "@webrtc-remote-control/react";

import Master from "./Master";
import Remote from "./Remote";
import FooterDisplay from "./Footer";

export default function App() {
  console.log("App render");
  const [mode, setMode] = useState(null);
  useEffect(() => {
    setMode(window.location.hash ? "remote" : "master");
  }, []);
  useEffect(() => {
    if (window.location.hash) {
      setMode("remote");
    } else {
      setMode("master");
    }
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
              import.meta.env.VITE_USE_LOCAL_PEER_SERVER
                ? {
                    host: "localhost",
                    port: 9000,
                    path: "/myapp",
                  }
                : undefined
            )
          }
          masterPeerId={
            (window.location.hash && window.location.hash.replace("#", "")) ||
            null
          }
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
