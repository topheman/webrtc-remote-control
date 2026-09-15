import { inject, reactive, toRefs, unref, watchEffect } from "vue";
import type { ToRefs, UnwrapNestedRefs } from "vue";
import type {
  HumanizeErrorType,
  IsConnectionFromRemoteType,
  MasterBindConnectionApiResolved,
  RemoteBindConnectionApiResolved,
} from "@webrtc-remote-control/core";

import { MyContext } from "./Provider.js";
import type { WebRTCRemoteControlContextValue } from "./Provider.js";

/**
 * The reactive object `usePeer` builds: the two readiness flags and the
 * resolved core api, on top of everything the provider put on the injected ref.
 *
 * `M` selects which side you are on, so `api` and `isConnectionFromRemote` are
 * typed for it. It defaults to neither, matching what the hook can actually
 * prove at runtime - it reads the mode off the injected value and has no way to
 * tell the compiler which one it found.
 */
export interface UsePeerState<
  M extends "remote" | "master",
> extends WebRTCRemoteControlContextValue {
  /** True once the peer instance the provider built is readable. */
  peerReady: boolean;
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

/** What `usePeer` returns: every member of the state above, as its own ref. */
export type UsePeerResult<M extends "remote" | "master"> = ToRefs<
  UnwrapNestedRefs<UsePeerState<M>>
>;

export function usePeer<
  M extends "remote" | "master" = "remote" | "master",
>(): UsePeerResult<M> {
  const context = inject(MyContext);
  const result = reactive({
    ...unref(context),
    // track if the peer object is ready (to allow consumer to subscribe to error event)
    peerReady: false,
    // track if the hook is fully ready
    ready: false,
    api: null as
      | MasterBindConnectionApiResolved
      | RemoteBindConnectionApiResolved
      | null,
  });
  watchEffect(() => {
    // run on next tick (ensure the `then` of the Provider has executed + retrieve the api from the resolve promise)
    void Promise.resolve().then(() => {
      result.peerReady = true;
      void context?.value.promise?.then((wrcApi) => {
        result.ready = true;
        result.api = wrcApi;
      });
    });
  });
  // The conditional members of `UsePeerState` are keyed on `M`, which the caller
  // chooses; the hook reads the mode off the injected value at runtime and
  // cannot narrow to it, so the assembled object is asserted once here.
  return toRefs(result) as unknown as UsePeerResult<M>;
}
