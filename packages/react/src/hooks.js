/* eslint-disable import/no-extraneous-dependencies */
import { useEffect, useContext, useRef, useState } from "react";

import { MyContext } from "./Provider";

export function usePeer() {
  // track if the hook is fully ready
  const [ready, setReady] = useState(false);
  // track if the peer object is ready (to allow consumer to subscribe to error event)
  const [, setPeerReady] = useState(false);
  const context = useContext(MyContext);
  const resolvedWrcApi = useRef(null);
  useEffect(() => {
    // run on next tick (ensure the `then` of the Provider has executed + retrieve the api from the resolve promise)
    Promise.resolve().then(() => {
      setPeerReady(true); // peer object is not null anymore
      context?.promise?.then((wrcApi) => {
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
