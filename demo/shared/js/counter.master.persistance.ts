import type { RemoteCounter } from "./counter.master.logic";

const MASTER_PERSISTANCE_COUNTERS_SESSION_STORAGE_KEY =
  "master-persist-counters";

/** Counters keyed by peer id, which is the shape kept in sessionStorage. */
export type PersistedCounters = Record<string, number>;

export function persistCountersToStorage(counters: RemoteCounter[]): void {
  let payload;
  try {
    payload = JSON.stringify(
      counters.reduce<PersistedCounters>((acc, cur) => {
        acc[cur.peerId] = cur.counter;
        return acc;
      }, {}),
    );
  } catch {
    payload = JSON.stringify({});
  }
  sessionStorage.setItem(
    MASTER_PERSISTANCE_COUNTERS_SESSION_STORAGE_KEY,
    payload,
  );
}

/**
 * `JSON.parse(null)` is `null` rather than a throw, so an empty store returns
 * `null` here - which is what the pre-TypeScript version did too, and what the
 * callers already treat as "nothing persisted".
 */
export function getCountersFromStorage(): PersistedCounters | null {
  try {
    return JSON.parse(
      sessionStorage.getItem(
        MASTER_PERSISTANCE_COUNTERS_SESSION_STORAGE_KEY,
      ) as string,
    ) as PersistedCounters | null;
  } catch {
    return {};
  }
}
