/* eslint-disable no-nested-ternary */
import React, { useEffect, useState } from "react";

import { HelloWorld } from "@webrtc-remote-control/react";

import Master from "./Master";
import Remote from "./Remote";

export default function App() {
  const [mode, setMode] = useState(null);
  useEffect(() => {
    if (window.location.hash) {
      setMode("remote");
    } else {
      setMode("master");
    }
  }, []);
  return (
    <div>
      <HelloWorld />
      <>
        {mode === null ? (
          "Loading ..."
        ) : mode === "remote" ? (
          <Remote />
        ) : (
          <Master />
        )}
      </>
    </div>
  );
}
