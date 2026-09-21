import { inject } from "vue";

import { MasterContext, RemoteContext } from "./Provider.js";
import type { UseMasterResult, UseRemoteResult } from "./Provider.js";

/**
 * The master side of the connection, from a component under one where
 * `provideMaster` was called.
 *
 * There is nothing to resolve here: the provider owns the peer and the api and
 * provides the finished value, so the composable is a lookup. Which side you are
 * on comes from which provider is above you, not from a type argument, so `api`
 * and `isConnectionFromRemote` are typed without anything being asserted - and
 * `if (state.value.ready)` narrows `api` and `peer` on its own.
 *
 * The utilities come back as plain values and only `state` is a ref, because
 * only `state` ever changes.
 */
export function useMaster(): UseMasterResult {
  const value = inject(MasterContext);
  if (!value) {
    throw new Error(
      "`useMaster` must be called under a component that called `provideMaster`.",
    );
  }
  return value;
}

/**
 * The remote side of {@link useMaster}, under a `provideRemote`.
 *
 * The two type parameters are the ones core infers for `reconnectNotice`, and
 * they are named here rather than inferred because the injection key is created
 * once, at module scope: it cannot carry the arguments a particular
 * `provideRemote` call was instantiated with. They default to `string`, which is
 * what the built-in messages are, so a caller who did not override the wording
 * writes nothing. A caller who returns something richer says so once -
 * `useRemote<VNode>()` - and the assertion below is what makes that hold.
 */
export function useRemote<
  TReconnecting = string,
  TStalled = string,
>(): UseRemoteResult<TReconnecting, TStalled> {
  const value = inject(RemoteContext);
  if (!value) {
    throw new Error(
      "`useRemote` must be called under a component that called `provideRemote`.",
    );
  }
  return value as UseRemoteResult<TReconnecting, TStalled>;
}
