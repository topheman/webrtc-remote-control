import React from "react";
import { usePeer } from "@webrtc-remote-control/react";

import ErrorsDisplay from "./ErrorsDisplay";
import QrcodeDisplay from "./QrcodeDisplay";
import OpenRemote from "./OpenRemote";
import CounterDisplay from "./CounterDisplay";
import RemotesList from "./RemotesList";
import ConsoleDisplay from "./ConsoleDisplay";
import FooterDisplay from "./Footer";

export default function Master() {
  const a = usePeer();
  console.log("Master.usePeer()", a);
  return (
    <>
      <ErrorsDisplay data={["bar"]} />
      <QrcodeDisplay data="foo" />
      <OpenRemote peerId="toto" />
      <p>
        Global counter: <CounterDisplay count={2} />
      </p>
      <RemotesList data={[{ counter: 2, peerId: "FGHJ" }]} />
      <ConsoleDisplay
        data={[
          { key: 1, level: "log", payload: { event: "foo", comment: "bar" } },
        ]}
      />
      <FooterDisplay from="2022" to="2022" />
    </>
  );
}
