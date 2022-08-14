import React, { useEffect, useState, useReducer } from "react";
import { usePeer } from "@webrtc-remote-control/react";

import RemotesList from "./RemotesList";
import ErrorsDisplay from "../../shared/js/components/ErrorsDisplay";
import QrcodeDisplay from "../../shared/js/components/QrcodeDisplay";
import OpenRemote from "./OpenRemote";
import DirectLinkToSourceCode from "./DirectLinkToSource";

// todo record/play x seconds (directly from useDeviceMotion hook - compose it ?) / proxy api to write on fs ? through tunnel ?
import { makeRemoteListReducer } from "./master.logic";

function makeRemotePeerUrl(peerId, locationOriginOverride) {
  return `${
    (locationOriginOverride || window.location.origin) +
    window.location.pathname
      .replace(/\/$/, "")
      .split("/")
      .slice(0, -1)
      .join("/")
  }/index.html#${peerId}`;
}

const remotesListReducer = makeRemoteListReducer();

export default function Master() {
  const [peerId, setPeerId] = useState(null);
  const [state, dispatch] = useReducer(remotesListReducer, {
    remotes: new Map(),
    currentRemote: null,
  });
  const [errors, setErrors] = useState(null);

  const { ready, api, peer, humanizeError } = usePeer();

  const onRemoteConnect = ({ id }) => {
    console.log({ event: "remote.connect", payload: { id } });
    dispatch({ type: "CONNECT", id });
  };
  const onRemoteDisconnect = ({ id }) => {
    console.log({ event: "remote.disconnect", payload: { id } });
    dispatch({ type: "DISCONNECT", id });
  };
  const onData = ({ id }, data) => {
    dispatch({ type: "MOTION", id, data });
  };
  const onPeerError = (error) => {
    setPeerId(null);
    console.error({ event: "error", error });
    setErrors([humanizeError(error)]);
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
        comment: "Master connected",
        payload: { id: peer.id },
      });
      api.on("remote.connect", onRemoteConnect);
      api.on("remote.disconnect", onRemoteDisconnect);
      api.on("data", onData);
    }
    return () => {
      console.log("Master.jsx.cleanup");
      if (ready) {
        api.off("remote.connect", onRemoteConnect);
        api.off("remote.disconnect", onRemoteDisconnect);
        api.off("data", onData);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return (
    <>
      <ErrorsDisplay data={errors} />
      <div style={{ display: "flex" }}>
        {peerId ? <QrcodeDisplay data={makeRemotePeerUrl(peerId)} /> : null}
        {peerId && import.meta.env.VITE_FORWARD_DOMAIN ? (
          <QrcodeDisplay
            data={makeRemotePeerUrl(
              peerId,
              import.meta.env.VITE_FORWARD_DOMAIN
            )}
          />
        ) : null}
      </div>
      <OpenRemote peerId={peerId} />
      <RemotesList
        list={state.remotes}
        onRemoteClick={(id) => dispatch({ type: "CURRENT_REMOTE", id })}
        showMotionInfos
      />
      <DirectLinkToSourceCode mode="master" />
    </>
  );
}
