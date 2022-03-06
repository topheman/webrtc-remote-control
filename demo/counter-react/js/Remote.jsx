import React, { useEffect } from "react";
import { usePeer } from "@webrtc-remote-control/react";

import ErrorsDisplay from "./ErrorsDisplay";
import CounterControl from "./CounterControl";
import ConsoleDisplay from "./ConsoleDisplay";
import FooterDisplay from "./Footer";

import { useLogger } from "./common";

export default function Remote() {
  const { logs, logger } = useLogger([]);

  const { ready, api, peer } = usePeer();

  useEffect(() => {
    if (ready) {
      logger.log({
        event: "open",
        comment: "Remote connected",
        payload: { id: peer.id },
      });
      api.on("remote.disconnect", (payload) => {
        logger.log({ event: "remote.disconnect", payload });
      });
      api.on("remote.reconnect", (payload) => {
        logger.log({ event: "remote.reconnect", payload });
        // todo send REMOTE_SET_NAME
      });
    }
  }, [ready]);

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
      <ConsoleDisplay data={[...logs].reverse()} />
      <FooterDisplay from="2022" to="2022" />
    </>
  );
}
