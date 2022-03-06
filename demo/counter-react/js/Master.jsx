import React, { useEffect, useState, useRef } from "react";
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
} from "../../counter-vanilla/js/master.persistance";
import {
  counterReducer,
  globalCount,
} from "../../counter-vanilla/js/master.logic";
import { makeLogger } from "../../shared/js/common";

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

function useLogger() {
  const loggerRef = useRef(makeLogger());
  const [logs, setLogs] = useState([]);
  const logger = Object.fromEntries(
    ["log", "info", "warn", "error"].map((level) => [
      level,
      (msg) => {
        const fullLogs = loggerRef.current[level](msg);
        setLogs(fullLogs);
      },
    ])
  );
  return {
    logger,
    logs,
  };
}

export default function Master() {
  const { logs, logger } = useLogger([]);
  const [peerId, setPeerId] = useState(null);
  const [remotesList, setRemotesList] = useState([]);

  const { ready, api, peer } = usePeer();

  console.log("Master.usePeer()", { ready, api, peer });
  useEffect(() => {
    if (ready) {
      console.log("Master.ready", { ready, api, peer });
      setPeerId(peer.id);
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
        setRemotesList((counters) => counterReducer(counters, { data, id }));
        // todo fix
        persistCountersToStorage(remotesList);
      });
    }
  }, [ready]);
  return (
    <>
      <ErrorsDisplay data={["bar"]} />
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
