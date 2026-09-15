import { useContext, useEffect, useRef, useState } from "react";
import type {
  HumanizeErrorType,
  IsConnectionFromRemoteType,
  MasterBindConnectionApiResolved,
  RemoteBindConnectionApiResolved,
} from "@webrtc-remote-control/core";

import { MyContext } from "./Provider.js";
import type { WebRTCRemoteControlContextValue } from "./Provider.js";

/**
 * What `usePeer` returns: the readiness flag and the resolved core api, plus
 * everything the provider put on the context.
 *
 * `M` selects which side you are on, so `api` and `isConnectionFromRemote` are
 * typed for it. It defaults to neither, matching what the hook can actually
 * prove at runtime - it reads the mode off the context and has no way to tell
 * the compiler which one it found.
 */
export interface UsePeerResult<
  M extends "remote" | "master",
> extends WebRTCRemoteControlContextValue {
  ready: boolean;
  api?: M extends "remote"
    ? RemoteBindConnectionApiResolved
    : MasterBindConnectionApiResolved;
  mode: "remote" | "master";
  humanizeError: HumanizeErrorType;
  isConnectionFromRemote: M extends "master"
    ? IsConnectionFromRemoteType
    : undefined;
}

export function usePeer<
  M extends "remote" | "master" = "remote" | "master",
>(): UsePeerResult<M> {
  // track if the hook is fully ready
  const [ready, setReady] = useState(false);
  // track if the peer object is ready (to allow consumer to subscribe to error event)
  const [, setPeerReady] = useState(false);
  const context = useContext(MyContext);
  const resolvedWrcApi = useRef<
    MasterBindConnectionApiResolved | RemoteBindConnectionApiResolved | null
  >(null);
  useEffect(() => {
    // run on next tick (ensure the `then` of the Provider has executed + retrieve the api from the resolve promise)
    void Promise.resolve().then(() => {
      setPeerReady(true); // peer object is not null anymore
      void context?.promise?.then((wrcApi) => {
        resolvedWrcApi.current = wrcApi;
        setReady(true);
      });
    });
    // Mount only, on purpose: the provider resolves its promise once, and
    // re-subscribing on every render would reset `ready`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The conditional members of `UsePeerResult` are keyed on `M`, which the
  // caller chooses; the hook reads the mode off the context at runtime and
  // cannot narrow to it, so the assembled object is asserted once here.
  return {
    ready,
    api: resolvedWrcApi.current,
    ...context,
  } as unknown as UsePeerResult<M>;
}
