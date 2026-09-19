import { computed, inject, reactive, ref, toRefs, unref } from "vue";
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
 * The reactive object `usePeer` builds: `ready` and the resolved core api, on
 * top of everything the provider put on the injected ref.
 *
 * `M` selects which side you are on, so `api` and `isConnectionFromRemote` are
 * typed for it. It defaults to neither, matching what the hook can actually
 * prove at runtime - it reads the mode off the injected value and has no way to
 * tell the compiler which one it found.
 */
export interface UsePeerState<
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

/** What `usePeer` returns: every member of the state above, as its own ref. */
export type UsePeerResult<M extends "remote" | "master"> = ToRefs<
  UnwrapNestedRefs<UsePeerState<M>>
>;

export function usePeer<
  M extends "remote" | "master" = "remote" | "master",
>(): UsePeerResult<M> {
  const context = inject(MyContext);
  /**
   * `provideWebTCRemoteControl`'s effect runs synchronously while the
   * provider's own `setup()` runs, and Vue always finishes a parent's
   * `setup()` before a child's starts - so `context` already carries the
   * resolved `peer` and `promise` by the time this hook runs. Only the
   * promise's own resolution is genuinely asynchronous, so that is the only
   * thing left to wait on.
   */
  const api = ref<
    MasterBindConnectionApiResolved | RemoteBindConnectionApiResolved | null
  >(null);
  void context?.value.promise?.then((wrcApi) => {
    api.value = wrcApi;
  });
  const result = reactive({
    ...unref(context),
    api,
    ready: computed(() => api.value !== null),
  });
  // The conditional members of `UsePeerState` are keyed on `M`, which the caller
  // chooses; the hook reads the mode off the injected value at runtime and
  // cannot narrow to it, so the assembled object is asserted once here.
  return toRefs(result) as unknown as UsePeerResult<M>;
}
