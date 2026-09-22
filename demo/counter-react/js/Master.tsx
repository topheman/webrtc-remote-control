import { useEffect, useState } from "react";
import { useMaster } from "@webrtc-remote-control/react";
import type { WrcMasterEvents } from "@webrtc-remote-control/core/master";

import ErrorsDisplay from "../../shared/js/components/ErrorsDisplay";
import QrcodeDisplay from "../../shared/js/components/QrcodeDisplay";
import OpenRemote from "./OpenRemote";
import CounterDisplay from "../../shared/js/components/CounterDisplay";
import RemotesList from "./RemotesList";
import ConsoleDisplay from "../../shared/js/components/ConsoleDisplay";
import DirectLinkToSourceCode from "./DirectLinkToSource";

import {
  persistCountersToStorage,
  getCountersFromStorage,
} from "../../shared/js/counter.master.persistance";
import {
  counterReducer,
  globalCount,
} from "../../shared/js/counter.master.logic";
import type {
  CounterAction,
  RemoteCounter,
} from "../../shared/js/counter.master.logic";
import { useLogger } from "../../shared/js/react-common";

function makeRemotePeerUrl(peerId: string) {
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
  const { logs, logger } = useLogger();
  const [peerId, setPeerId] = useState<string | null>(null);
  const [remotesList, setRemotesList] = useState<RemoteCounter[]>([]);
  const [errors, setErrors] = useState<string[] | null>(null);

  // `ready` is the discriminant of the union the hook returns, so it narrows
  // `api` and `peer` on its own - nothing below needs an assertion.
  const { ready, api, peer, humanizeError } = useMaster();

  const onRemoteConnect: WrcMasterEvents["remote.connect"] = ({ id }) => {
    const countersFromStorage = getCountersFromStorage();
    logger.log({ event: "remote.connect", payload: { id } });
    setRemotesList((counters) => [
      ...counters,
      { counter: countersFromStorage?.[id] ?? 0, peerId: id },
    ]);
  };
  const onRemoteDisconnect: WrcMasterEvents["remote.disconnect"] = ({ id }) => {
    logger.log({ event: "remote.disconnect", payload: { id } });
    setRemotesList((counters) =>
      // eslint-disable-next-line no-shadow
      counters.filter(({ peerId }) => peerId !== id),
    );
  };
  const onData: WrcMasterEvents["data"] = ({ id }, data) => {
    logger.log({ event: "data", data, id });
    setRemotesList((counters) => {
      const state = counterReducer(counters, {
        data: data as CounterAction,
        id,
      });
      persistCountersToStorage(state);
      return state;
    });
  };
  const onPeerError = (error: Error) => {
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
      // eslint-disable-next-line no-console -- traces the teardown on purpose
      console.log("Master.tsx.cleanup");
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
            api.sendTo(id!, {
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
