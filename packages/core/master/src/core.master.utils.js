// eslint-disable-next-line import/no-relative-packages
import { PING_INTERVAL } from "../../shared/common";

export function usePollingData() {
  const pollingData = new Map();
  return {
    initPollingData: (peerId) => pollingData.set(peerId, []),
    pushPollingData: (peerId, data) => {
      const date = new Date(data?.payload);
      const result = Number.isNaN(date.getTime()) ? data.payload : date;
      if (pollingData.has(peerId)) {
        pollingData.get(peerId).push(result);
      } else {
        pollingData.set(peerId, [result]);
      }
    },
    pollingData, // todo expose processed data
  };
}

export function processPollingData(
  pollingData,
  connections,
  { pingInterval = PING_INTERVAL, now = new Date() } = {}
) {
  console.log(pingInterval, now);
  // if only one entry (original one)
  // no more than X entries
  // if remote idle to long conn.disconnect + make sure to stop tracking the connection
  // remove the entry in pollingData
  // pollingData.get(peerId) should also get removed when the conn is disconnected any other way
}
