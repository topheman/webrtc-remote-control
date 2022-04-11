import React, { useEffect, useState } from "react";
import { usePeer } from "@webrtc-remote-control/react";

import ErrorsDisplay from "./ErrorsDisplay";
import RemoteCountControl from "./RemoteCountControl";
import RemoteNameControl from "./RemoteNameControl";
import ConsoleDisplay from "./ConsoleDisplay";
import DirectLinkToSourceCode from "./DirectLinkToSource";

import { useLogger, useSessionStorage } from "./common";

export default function Remote() {
  const { logs, logger } = useLogger([]);
  const [peerId, setPeerId] = useState(null);
  const [name, setName] = useSessionStorage("remote-name", "");
  const [errors, setErrors] = useState(null);

  const { ready, api, peer, humanizeError } = usePeer();

  const onRemoteDisconnect = (payload) => {
    logger.log({ event: "remote.disconnect", payload });
  };
  const onRemoteReconnect = (payload) => {
    logger.log({ event: "remote.reconnect", payload });
    if (name) {
      api.send({ type: "REMOTE_SET_NAME", name });
    }
  };
  const onPeerError = (error) => {
    setPeerId(null);
    logger.error({ event: "error", error });
    setErrors([humanizeError(error)]);
  };
  const onData = (_, data) => {
    logger.log({ event: "data", data });
    if (data.type === "PING") {
      window?.frameworkIconPlay();
    }
  };

  useEffect(() => {
    if (peer) {
      peer.on("error", onPeerError);
    }
    return () => {
      if (peer) {
        peer.off("error", onPeerError);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer]);

  useEffect(() => {
    if (ready) {
      setPeerId(peer.id);
      logger.log({
        event: "open",
        comment: "Remote connected",
        payload: { id: peer.id },
      });
      api.on("remote.disconnect", onRemoteDisconnect);
      api.on("remote.reconnect", onRemoteReconnect);
      api.on("data", onData);
      if (name) {
        api.send({ type: "REMOTE_SET_NAME", name });
      }
    }
    return () => {
      console.log("Remote.jsx.cleanup");
      if (ready) {
        api.off("remote.disconnect", onRemoteDisconnect);
        api.off("remote.reconnect", onRemoteReconnect);
        api.off("data", onData);
      }
    };
  }, [ready]);

  function onIncrement() {
    if (ready) {
      api.send({ type: "COUNTER_INCREMENT" });
    }
  }
  function onDecrement() {
    if (ready) {
      api.send({ type: "COUNTER_DECREMENT" });
    }
  }
  function onChangeName(value) {
    setName(value);
  }
  function onConfirmName() {
    if (ready) {
      api.send({ type: "REMOTE_SET_NAME", name });
    }
  }
  return (
    <>
      <ErrorsDisplay data={errors} />
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
      <DirectLinkToSourceCode mode="remote" />
    </>
  );
}
