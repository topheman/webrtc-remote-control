import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useRemote } from "@webrtc-remote-control/react";
import type { WrcRemoteEvents } from "@webrtc-remote-control/core/remote";

import ErrorsDisplay from "../../shared/js/components/ErrorsDisplay";
import DirectLinkToSourceCode from "./DirectLinkToSource";

import { useSessionStorage } from "../../shared/js/react-common";
import { useDeviceOrientation } from "../../shared/js/react-useDeviceOrientation";
import { orientationToRotation } from "./accelerometer.helpers";

// Both of these pull three in, so both stay behind the lazy boundary the page
// already had.
const Phone3D = lazy(() => import("./Phone3D"));
const PhonesCanvas = lazy(() => import("./PhonesCanvas"));

export default function Remote() {
  // eslint-disable-next-line no-unused-vars
  const [peerId, setPeerId] = useState<string | null>(null);
  const [
    name,
    // setName
  ] = useSessionStorage<string>("remote-name", "");
  const [errors, setErrors] = useState<string[] | null>(null);
  const [phoneScale, setPhoneScale] = useState(1);
  // Fiber raycasts the phone's pointer events from this element rather than
  // from the canvas; it has to contain both. See `PhonesCanvas.tsx` - pressing
  // the phone is what sends a PING here, so it is load-bearing.
  const containerRef = useRef<HTMLDivElement>(null);

  // see the note in `Master.tsx` about `ready` narrowing `api` and `peer`
  const { ready, api, peer, humanizeError, isIgnorableError, reconnectNotice } =
    useRemote();

  const {
    orientation,
    requestAccess: requestDeviceOrientationAccess,
    permissionState,
  } = useDeviceOrientation({ precision: 2, throttle: 16 });

  const onRemoteDisconnect: WrcRemoteEvents["remote.disconnect"] = (
    payload,
  ) => {
    console.log({ event: "remote.disconnect", payload });
  };
  const onRemoteReconnecting: WrcRemoteEvents["remote.reconnecting"] = (
    payload,
  ) => {
    console.log({ event: "remote.reconnecting", payload });
    setErrors([reconnectNotice(payload)]);
  };
  const onRemoteReconnect: WrcRemoteEvents["remote.reconnect"] = (payload) => {
    console.log({ event: "remote.reconnect", payload });
    // `onPeerError` nulled `peerId` and put an error on screen. Reconnecting
    // has to undo both, or a remote that came back is indistinguishable from
    // one that never did.
    setPeerId(payload.id);
    setErrors(null);
    // see the note in `counter-react` - a callback closes over the destructured
    // value, so it branches on `ready` itself.
    if (ready && name) {
      api.send({ type: "REMOTE_SET_NAME", name });
    }
  };
  const onPeerError = (error: Error) => {
    setPeerId(null);
    console.error({ event: "error", error });
    // The errors core's own retry loop provokes are not worth showing: mid
    // recovery `humanizeError` would advise reloading, which is the one thing
    // the user should not do. Core knows whether it is retrying, so it answers
    // rather than every page tracking it.
    if (isIgnorableError(error)) {
      return;
    }
    setErrors([humanizeError(error)]);
  };
  const onData: WrcRemoteEvents["data"] = (_, data) => {
    console.log({ event: "data", data });
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
      console.log({
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

  useEffect(() => {
    if (ready) {
      api.send({ type: "ORIENTATION", ...orientation });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation]);
  return (
    <>
      <ErrorsDisplay data={errors} />
      <div ref={containerRef}>
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
        <Suspense fallback={null}>
          <PhonesCanvas eventSource={containerRef} />
        </Suspense>
      </div>
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
