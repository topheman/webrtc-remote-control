import React, { useEffect, useState, lazy, Suspense } from "react";
import { usePeer } from "@webrtc-remote-control/react";

import ErrorsDisplay from "../../shared/js/components/ErrorsDisplay";
import DirectLinkToSourceCode from "./DirectLinkToSource";

import { useSessionStorage } from "../../shared/js/react-common";
import { useDeviceOrientation } from "../../shared/js/react-useDeviceOrientation";
import { orientationToRotation } from "./accelerometer.helpers";

const Phone3D = lazy(() => import("./Phone3D"));

export default function Remote() {
  // eslint-disable-next-line no-unused-vars
  const [peerId, setPeerId] = useState(null);
  const [
    name,
    // setName
  ] = useSessionStorage("remote-name", "");
  const [errors, setErrors] = useState(null);
  const [phoneScale, setPhoneScale] = useState(1);

  const { ready, api, peer, humanizeError } = usePeer();

  const {
    orientation,
    requestAccess: requestDeviceOrientationAccess,
    permissionState,
  } = useDeviceOrientation({ precision: 2, throttle: 16 });

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
      api.send({ type: "ORIENTATION", ...orientation });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation]);
  return (
    <>
      <ErrorsDisplay data={errors} />
      <Suspense fallback={<div>Loading 3D model ...</div>}>
        <Phone3D
          rotation={orientationToRotation(orientation, -1)}
          width="100%"
          height={300}
          peerId={peerId}
          colorHover="pink"
          scale={phoneScale}
          onPointerDown={() => {
            setPhoneScale(1.3);
            if (ready) {
              api.send({ type: "PING_DOWN" });
            }
          }}
          onPointerUp={() => {
            setPhoneScale(1);
            if (ready) {
              api.send({ type: "PING_UP" });
            }
          }}
          onPointerLeave={() => {
            setPhoneScale(1);
            if (ready) {
              api.send({ type: "PING_UP" });
            }
          }}
        />
      </Suspense>
      {!orientation ? (
        <p className="request-permission-button-wrapper">
          <button
            className="request-permission-button"
            onClick={() => requestDeviceOrientationAccess()}
          >
            Click here to start
          </button>
        </p>
      ) : null}
      {permissionState === "denied" ? (
        <p className="deviceorientation-error">
          Request to access the device orientation was rejected, please grant it
          by clicking yes on the prompt.
        </p>
      ) : null}
      {orientation ? (
        <ul>
          <li>alpha: {orientation.alpha}</li>
          <li>beta: {orientation.beta}</li>
          <li>gamma: {orientation.gamma}</li>
        </ul>
      ) : null}
      <DirectLinkToSourceCode mode="remote" />
    </>
  );
}
