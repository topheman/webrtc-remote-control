import { useContext } from "react";

import { MasterContext, RemoteContext } from "./Provider.js";
import type { UseMasterResult, UseRemoteResult } from "./Provider.js";

/**
 * The master side of the connection, from inside a `MasterProvider`.
 *
 * There is nothing to resolve here: the provider owns the peer and the api and
 * puts the finished value on its context, so the hook is a lookup. Which side
 * you are on comes from which provider you are under, not from a type argument,
 * so `api` and `isConnectionFromRemote` are typed without anything being
 * asserted - and `if (ready)` narrows `api` and `peer` on its own.
 */
export function useMaster(): UseMasterResult {
  const value = useContext(MasterContext);
  if (!value) {
    throw new Error("`useMaster` must be called inside a `MasterProvider`.");
  }
  return value;
}

/** The remote side of {@link useMaster}, from inside a `RemoteProvider`. */
export function useRemote(): UseRemoteResult {
  const value = useContext(RemoteContext);
  if (!value) {
    throw new Error("`useRemote` must be called inside a `RemoteProvider`.");
  }
  return value;
}
