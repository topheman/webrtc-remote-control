import React, { useEffect, useState } from "react";
import { usePeer } from "@webrtc-remote-control/react";

import ErrorsDisplay from "./ErrorsDisplay";
import RemoteCountControl from "./RemoteCountControl";
import RemoteNameControl from "./RemoteNameControl";
import ConsoleDisplay from "./ConsoleDisplay";
import FooterDisplay from "./Footer";

import { useLogger, useSessionStorage } from "./common";

export default function Remote() {
  const { logs, logger } = useLogger([]);
  const [peerId, setPeerId] = useState(null);
  const [name, setName] = useSessionStorage("remote-name", "");

  const { ready, api, peer } = usePeer();

  useEffect(() => {
    if (ready) {
      setPeerId(peer.id);
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
        if (name) {
          api.send({ type: "REMOTE_SET_NAME", name });
        }
      });
      if (name) {
        api.send({ type: "REMOTE_SET_NAME", name });
      }
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
  function onChangeName(value) {
    console.log("onChangeName", value);
    setName(value);
  }
  function onConfirmName() {
    console.log("onConfirmName", name);
    if (ready) {
      api.send({ type: "REMOTE_SET_NAME", name });
    }
  }
  return (
    <>
      <ErrorsDisplay />
      <RemoteCountControl
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        disabled={!peerId}
      />
      <RemoteNameControl
        onChangeName={onChangeName}
        name={name}
        onConfirmName={onConfirmName}
        disabled={!peerId}
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
