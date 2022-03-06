import React from "react";
import { usePeer } from "@webrtc-remote-control/react";

import ErrorsDisplay from "./ErrorsDisplay";
import CounterControl from "./CounterControl";
import ConsoleDisplay from "./ConsoleDisplay";
import FooterDisplay from "./Footer";

export default function Remote() {
  const { ready, api, peer } = usePeer();
  console.log("Remote.usePeer()", { ready, api, peer });
  function onIncrement() {
    console.log("onIncrement");
    if (ready) {
      api.send({ type: "COUNTER_INCREMENT" });
    }
  }
  function onDecrement() {
    console.log("onDecrement");
    if (ready) {
      api.send({ type: "COUNTER_DECREMENT" });
    }
  }
  function onChangeName(name) {
    console.log("onChangeName", name);
    if (ready) {
      api.send({ type: "REMOTE_SET_NAME", name });
    }
  }
  return (
    <>
      <ErrorsDisplay />
      <CounterControl
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onChangeName={onChangeName}
      />
      <p>
        Check the counter updating in real-time on the original page, thanks to
        WebRTC.
      </p>
      <ConsoleDisplay
        data={[
          { key: 1, level: "log", payload: { event: "foo", comment: "bar" } },
        ]}
      />
      <FooterDisplay from="2022" to="2022" />
    </>
  );
}
