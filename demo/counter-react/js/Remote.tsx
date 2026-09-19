import { useEffect, useRef, useState } from "react";
import { useRemote } from "@webrtc-remote-control/react";
import type { WrcRemoteEvents } from "@webrtc-remote-control/core/remote";

import ErrorsDisplay from "../../shared/js/components/ErrorsDisplay";
import RemoteCountControl from "./RemoteCountControl";
import RemoteNameControl from "./RemoteNameControl";
import ConsoleDisplay from "../../shared/js/components/ConsoleDisplay";
import DirectLinkToSourceCode from "./DirectLinkToSource";

import { useLogger, useSessionStorage } from "../../shared/js/react-common";
import { makeReconnectNotice } from "@webrtc-remote-control/core";

// The wording is the consumer's, the threshold core's.
const reconnectNotice = makeReconnectNotice();

export default function Remote() {
  const { logs, logger } = useLogger();
  const [peerId, setPeerId] = useState<string | null>(null);
  const [name, setName] = useSessionStorage<string>("remote-name", "");
  const [errors, setErrors] = useState<string[] | null>(null);

  // see the note in `Master.tsx` about `ready` narrowing `api` and `peer`
  const { ready, api, peer, humanizeError } = useRemote();

  const onRemoteDisconnect: WrcRemoteEvents["remote.disconnect"] = (
    payload,
  ) => {
    logger.log({ event: "remote.disconnect", payload });
  };
  // A ref, not state: `onPeerError` is registered in an effect keyed on `peer`
  // and would otherwise close over whatever this was on first render.
  const reconnecting = useRef(false);
  const onRemoteReconnecting: WrcRemoteEvents["remote.reconnecting"] = (
    payload,
  ) => {
    logger.log({ event: "remote.reconnecting", payload });
    reconnecting.current = true;
    setErrors([reconnectNotice(payload)]);
  };
  const onRemoteReconnect: WrcRemoteEvents["remote.reconnect"] = (payload) => {
    logger.log({ event: "remote.reconnect", payload });
    reconnecting.current = false;
    // `onPeerError` nulled `peerId` and put an error on screen, which disables
    // every control. Reconnecting has to undo both, or a remote that came back
    // is indistinguishable from one that never did.
    setPeerId(payload.id);
    setErrors(null);
    // `ready` narrows where it is read, and this callback is not that place:
    // it closes over the destructured value, so it has to branch for itself.
    if (ready && name) {
      api.send({ type: "REMOTE_SET_NAME", name });
    }
  };
  const onPeerError = (error: Error) => {
    setPeerId(null);
    logger.error({ event: "error", error });
    // While the retry loop is running, a `peer-unavailable` is just the attempt
    // that lost its race to the master re-registering. The reconnection notice
    // already says so, and `humanizeError` would talk over it with advice to
    // reload - the one thing the user does not need to do.
    if (
      reconnecting.current &&
      (error as { type?: string }).type === "peer-unavailable"
    ) {
      return;
    }
    setErrors([humanizeError(error)]);
  };
  const onData: WrcRemoteEvents["data"] = (_, data) => {
    logger.log({ event: "data", data });
    if ((data as { type?: string }).type === "PING") {
      window.frameworkIconPlay();
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
      api.on("remote.reconnecting", onRemoteReconnecting);
      api.on("remote.reconnect", onRemoteReconnect);
      api.on("data", onData);
      if (name) {
        api.send({ type: "REMOTE_SET_NAME", name });
      }
    }
    return () => {
      console.log("Remote.tsx.cleanup");
      if (ready) {
        api.off("remote.disconnect", onRemoteDisconnect);
        api.off("remote.reconnecting", onRemoteReconnecting);
        api.off("remote.reconnect", onRemoteReconnect);
        api.off("data", onData);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  function onChangeName(value: string) {
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
