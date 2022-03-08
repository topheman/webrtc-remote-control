const MASTER_PERSISTANCE_COUNTERS_SESSION_STORAGE_KEY =
  "master-persist-counters";

export function persistCountersToStorage(counters) {
  let payload;
  try {
    payload = JSON.stringify(
      counters.reduce((acc, cur) => {
        acc[cur.peerId] = cur.counter;
        return acc;
      }, {})
    );
  } catch {
    payload = JSON.stringify({});
  }
  sessionStorage.setItem(
    MASTER_PERSISTANCE_COUNTERS_SESSION_STORAGE_KEY,
    payload
  );
}

export function getCountersFromStorage() {
  try {
    return JSON.parse(
      sessionStorage.getItem(MASTER_PERSISTANCE_COUNTERS_SESSION_STORAGE_KEY)
    );
  } catch {
    return {};
  }
}
