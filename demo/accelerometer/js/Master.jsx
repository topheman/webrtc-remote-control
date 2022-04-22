import React, { useEffect, useState } from "react";
import { usePeer } from "@webrtc-remote-control/react";

import RemotesList from "./RemotesList";
import ErrorsDisplay from "./ErrorsDisplay";
import QrcodeDisplay from "./QrcodeDisplay";
import OpenRemote from "./OpenRemote";
import DirectLinkToSourceCode from "./DirectLinkToSource";

import { remotesListReducer } from "./master.logic";

function makeRemotePeerUrl(peerId) {
  return `${
    window.location.origin +
    window.location.pathname
      .replace(/\/$/, "")
      .split("/")
      .slice(0, -1)
      .join("/")
  }/index.html#${peerId}`;
}

export default function Master() {
  const [peerId, setPeerId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [remotesList, setRemotesList] = useState([]);
  const [errors, setErrors] = useState(null);

  const { ready, api, peer, humanizeError } = usePeer();

  const onRemoteConnect = ({ id }) => {
    console.log({ event: "remote.connect", payload: { id } });
    setRemotesList((remotes) => [
      ...remotes,
      { alpha: 0, beta: 0, gamma: 0, peerId: id },
    ]);
  };
  const onRemoteDisconnect = ({ id }) => {
    console.log({ event: "remote.disconnect", payload: { id } });
    setRemotesList((remotes) =>
      // eslint-disable-next-line no-shadow
      remotes.filter(({ peerId }) => peerId !== id)
    );
  };
  const onData = ({ id }, data) => {
    console.log({ event: "data", data, id });
    setRemotesList((remotes) => {
      const state = remotesListReducer(remotes, { data, id });
      return state;
    });
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
      {peerId ? <QrcodeDisplay data={makeRemotePeerUrl(peerId)} /> : null}
      <OpenRemote peerId={peerId} />
      <RemotesList list={remotesList} />
      <DirectLinkToSourceCode mode="master" />
    </>
  );
}
