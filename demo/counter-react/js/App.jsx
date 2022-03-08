/* eslint-disable no-nested-ternary */
import React, { useState, useEffect } from "react";

import {
  HelloWorld,
  WebRTCRemoteControlProvider,
} from "@webrtc-remote-control/react";

import Master from "./Master";
import Remote from "./Remote";

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
  return mode ? (
    <WebRTCRemoteControlProvider
      mode={mode}
      init={({ getPeerId }) => new Peer(getPeerId())}
      masterPeerId={
        (window.location.hash && window.location.hash.replace("#", "")) || null
      }
    >
      <>
        <HelloWorld />
        {mode === "remote" ? <Remote /> : <Master />}
      </>
    </WebRTCRemoteControlProvider>
  ) : (
    "Loading ..."
  );
}
