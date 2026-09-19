import { useContext, useEffect, useState } from "react";
import type {
  HumanizeErrorType,
  IsConnectionFromRemoteType,
  MasterBindConnectionApiResolved,
  RemoteBindConnectionApiResolved,
} from "@webrtc-remote-control/core";

import { MyContext } from "./Provider.js";
import type { WebRTCRemoteControlContextValue } from "./Provider.js";

/** The promise the provider puts on the context, once it is there. */
type ResolvedApiPromise = NonNullable<
  WebRTCRemoteControlContextValue["promise"]
>;

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
  const context = useContext(MyContext);
  const promise = context?.promise;
  /**
   * The resolved api is stored next to the promise it came from. A new promise
   * means the provider rebuilt the connection, so the previous api belongs to a
   * peer that has been disconnected; comparing the two during render drops it
   * without an extra effect and an extra render to do the resetting.
   */
  const [resolved, setResolved] = useState<{
    promise: ResolvedApiPromise;
    api: MasterBindConnectionApiResolved | RemoteBindConnectionApiResolved;
  } | null>(null);
  useEffect(() => {
    if (!promise) {
      return;
    }
    let current = true;
    void promise.then((api) => {
      if (current) {
        setResolved({ promise, api });
      }
    });
    return () => {
      current = false;
    };
  }, [promise]);
  const api =
    resolved !== null && resolved.promise === promise ? resolved.api : null;
  // The conditional members of `UsePeerResult` are keyed on `M`, which the
  // caller chooses; the hook reads the mode off the context at runtime and
  // cannot narrow to it, so the assembled object is asserted once here.
  return {
    ready: api !== null,
    api,
    ...context,
  } as unknown as UsePeerResult<M>;
}
