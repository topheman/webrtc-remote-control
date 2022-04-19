import React, { useEffect, useState } from "react";
import { usePeer } from "@webrtc-remote-control/react";

import ErrorsDisplay from "./ErrorsDisplay";
import QrcodeDisplay from "./QrcodeDisplay";
import OpenRemote from "./OpenRemote";
import CounterDisplay from "./CounterDisplay";
import RemotesList from "./RemotesList";
import ConsoleDisplay from "./ConsoleDisplay";
import DirectLinkToSourceCode from "./DirectLinkToSource";

import {
  persistCountersToStorage,
  getCountersFromStorage,
} from "../../shared/js/counter.master.persistance";
import {
  counterReducer,
  globalCount,
} from "../../shared/js/counter.master.logic";
import { useLogger } from "../../shared/js/react-common";

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
  const { logs, logger } = useLogger([]);
  const [peerId, setPeerId] = useState(null);
  const [remotesList, setRemotesList] = useState([]);
  const [errors, setErrors] = useState(null);

  const { ready, api, peer, humanizeError } = usePeer();

  const onRemoteConnect = ({ id }) => {
    const countersFromStorage = getCountersFromStorage();
    logger.log({ event: "remote.connect", payload: { id } });
    setRemotesList((counters) => [
      ...counters,
      { counter: countersFromStorage?.[id] ?? 0, peerId: id },
    ]);
  };
  const onRemoteDisconnect = ({ id }) => {
    logger.log({ event: "remote.disconnect", payload: { id } });
    setRemotesList((counters) =>
      // eslint-disable-next-line no-shadow
      counters.filter(({ peerId }) => peerId !== id)
    );
  };
  const onData = ({ id }, data) => {
    logger.log({ event: "data", data, id });
    setRemotesList((counters) => {
      const state = counterReducer(counters, { data, id });
      persistCountersToStorage(state);
      return state;
    });
  };
  const onPeerError = (error) => {
    setPeerId(null);
    logger.error({ event: "error", error });
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
      logger.log({
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
      <p>
        Global counter: <CounterDisplay count={globalCount(remotesList)} />
      </p>
      <RemotesList
        data={remotesList}
        onPingAll={() => {
          if (ready) {
            api.sendAll({
              type: "PING",
              date: new Date(),
            });
          }
        }}
        onPing={(id) => {
          if (ready) {
            api.sendTo(id, {
              type: "PING",
              date: new Date(),
            });
          }
        }}
      />
      <ConsoleDisplay data={[...logs].reverse()} />
      <DirectLinkToSourceCode mode="master" />
    </>
  );
}
