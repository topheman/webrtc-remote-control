import React, { useEffect, useState } from "react";
import { usePeer } from "@webrtc-remote-control/react";

import ErrorsDisplay from "./ErrorsDisplay";
import QrcodeDisplay from "./QrcodeDisplay";
import OpenRemote from "./OpenRemote";
import CounterDisplay from "./CounterDisplay";
import RemotesList from "./RemotesList";
import ConsoleDisplay from "./ConsoleDisplay";
import FooterDisplay from "./Footer";

import {
  persistCountersToStorage,
  getCountersFromStorage,
} from "../../shared/js/counter.master.persistance";
import {
  counterReducer,
  globalCount,
} from "../../shared/js/counter.master.logic";
import { useLogger } from "./common";

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

  console.log("Master.usePeer()", { ready, api, peer });
  useEffect(() => {
    if (ready) {
      setPeerId(peer.id);
      logger.log({
        event: "open",
        comment: "Master connected",
        payload: { id: peer.id },
      });
      api.on("remote.connect", ({ id }) => {
        const countersFromStorage = getCountersFromStorage();
        logger.log({ event: "remote.connect", payload: { id } });
        setRemotesList((counters) => [
          ...counters,
          { counter: countersFromStorage?.[id] ?? 0, peerId: id },
        ]);
      });
      api.on("remote.disconnect", ({ id }) => {
        logger.log({ event: "remote.disconnect", payload: { id } });
        setRemotesList((counters) =>
          // eslint-disable-next-line no-shadow
          counters.filter(({ peerId }) => peerId !== id)
        );
      });
      api.on("data", ({ id }, data) => {
        logger.log({ event: "data", data, id });
        setRemotesList((counters) => {
          const state = counterReducer(counters, { data, id });
          persistCountersToStorage(state);
          return state;
        });
      });
      peer.on("error", (error) => {
        setPeerId(null);
        logger.error({ event: "error", error });
        setErrors([humanizeError(error)]);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => {
    console.log("remotesList changed", remotesList);
  }, [remotesList]);
  return (
    <>
      <ErrorsDisplay data={errors} />
      <QrcodeDisplay data={makeRemotePeerUrl(peerId)} />
      <OpenRemote peerId={peerId} />
      <p>
        Global counter: <CounterDisplay count={globalCount(remotesList)} />
      </p>
      <RemotesList data={remotesList} />
      <ConsoleDisplay data={[...logs].reverse()} />
      <FooterDisplay from="2022" to="2022" />
    </>
  );
}
