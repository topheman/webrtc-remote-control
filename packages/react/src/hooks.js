/* eslint-disable import/no-extraneous-dependencies */
import { useEffect, useContext, useRef, useState } from "react";

import { MyContext } from "./Provider";

export function usePeer() {
  const [ready, setReady] = useState(false);
  const context = useContext(MyContext);
  const resolvedWrcApi = useRef(null);
  console.log("hooks.usePeer", context);
  useEffect(() => {
    // run on next tick (ensure the `then` of the Provider has executed + retrieve the api from the resolve promise)
    Promise.resolve().then(() => {
      console.log("hooks.usePeer.useEffect", context);
      context?.promise?.then((wrcApi) => {
        console.log("hooks.context?.promise?.then", wrcApi);
        resolvedWrcApi.current = wrcApi;
        setReady(true);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    ready,
    api: resolvedWrcApi.current,
    ...context,
  };
}
