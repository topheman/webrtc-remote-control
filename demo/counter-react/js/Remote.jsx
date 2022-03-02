import React from "react";

import ErrorsDisplay from "./ErrorsDisplay";
import CounterControl from "./CounterControl";
import ConsoleDisplay from "./ConsoleDisplay";
import FooterDisplay from "./Footer";

export default function Remote() {
  function onIncrement() {
    console.log("onIncrement");
  }
  function onDecrement() {
    console.log("onDecrement");
  }
  function onChangeName(name) {
    console.log("onChangeName", name);
  }
  return (
    <>
      <ErrorsDisplay />
      <CounterControl
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onChangeName={onChangeName}
      />
      <p>
        Check the counter updating in real-time on the original page, thanks to
        WebRTC.
      </p>
      <ConsoleDisplay
        data={[
          { key: 1, level: "log", payload: { event: "foo", comment: "bar" } },
        ]}
      />
      <FooterDisplay from="2022" to="2022" />
    </>
  );
}
