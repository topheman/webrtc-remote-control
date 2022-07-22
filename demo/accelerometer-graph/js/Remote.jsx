import React, { useEffect, useState } from "react";
import { usePeer } from "@webrtc-remote-control/react";

import ErrorsDisplay from "../../shared/js/components/ErrorsDisplay";
import DirectLinkToSourceCode from "./DirectLinkToSource";

import { useSessionStorage } from "../../shared/js/react-common";
import { useDeviceMotion } from "../../shared/js/react-useDeviceMotion";

export default function Remote() {
  // eslint-disable-next-line no-unused-vars
  const [peerId, setPeerId] = useState(null);
  const [
    name,
    // setName
  ] = useSessionStorage("remote-name", "");
  const [errors, setErrors] = useState(null);

  const { ready, api, peer, humanizeError } = usePeer();

  const {
    motion,
    requestAccess: requestDeviceMotionAccess,
    permissionState,
  } = useDeviceMotion({ throttle: 16 });

  const onRemoteDisconnect = (payload) => {
    console.log({ event: "remote.disconnect", payload });
  };
  const onRemoteReconnect = (payload) => {
    console.log({ event: "remote.reconnect", payload });
    if (name) {
      api.send({ type: "REMOTE_SET_NAME", name });
    }
  };
  const onPeerError = (error) => {
    setPeerId(null);
    console.error({ event: "error", error });
    setErrors([humanizeError(error)]);
  };
  const onData = (_, data) => {
    console.log({ event: "data", data });
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
      console.log({
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

  useEffect(() => {
    if (ready) {
      api.send({ type: "MOTION", ...motion });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion]);
  return (
    <>
      <ErrorsDisplay data={errors} />
      {!motion ? (
        <p className="request-permission-button-wrapper">
          <button
            className="request-permission-button"
            onClick={() => requestDeviceMotionAccess()}
          >
            Click here to start
          </button>
        </p>
      ) : null}
      {permissionState === "denied" ? (
        <p className="devicemotion-error">
          Request to access the device motion was rejected, please grant it by
          clicking yes on the prompt.
        </p>
      ) : null}
      {motion ? (
        <ul>
          <li>acceleration: {JSON.stringify(motion.acceleration)}</li>
          <li>
            accelerationIncludingGravity:{" "}
            {JSON.stringify(motion.accelerationIncludingGravity)}
          </li>
          <li>rotationRate: {JSON.stringify(motion.rotationRate)}</li>
          <li>interval: {JSON.stringify(motion.interval)}</li>
        </ul>
      ) : null}
      <DirectLinkToSourceCode mode="remote" />
    </>
  );
}
