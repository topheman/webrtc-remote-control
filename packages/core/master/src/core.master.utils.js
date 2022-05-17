// eslint-disable-next-line import/no-relative-packages
import { PING_INTERVAL, CONN_TIMEOUT } from "../../shared/common";

function dateOrString(string) {
  const date = new Date(string);
  return Number.isNaN(date.getTime()) ? string : date;
}

export function usePollingData() {
  const pollingData = new Map();
  return {
    initPollingData: (peerId) => pollingData.set(peerId, []),
    pushPollingData: (peerId, data) => {
      const result = dateOrString(data?.payload);
      if (pollingData.has(peerId)) {
        pollingData.get(peerId).push(result);
      } else {
        pollingData.set(peerId, [result]);
      }
    },
    pollingData, // todo expose processed data
  };
}

function reduceData(data = []) {
  let reducedData = [...data];
  // remove anything before a "PAUSE" or "RESUME"
  const pauseIndex = reducedData.indexOf("PAUSE");
  const resumeIndex = reducedData.indexOf("RESUME");
  if (
    pauseIndex > -1 &&
    pauseIndex > resumeIndex &&
    reducedData.length > pauseIndex + 1
  ) {
    reducedData = reducedData.slice(pauseIndex);
    return reducedData;
  }
  if (
    resumeIndex > -1 &&
    resumeIndex > pauseIndex &&
    reducedData.length > resumeIndex + 1
  ) {
    reducedData = reducedData.slice(resumeIndex);
    return reducedData;
  }
  // only keep 3 entries at all times
  if (reducedData.length > 3) {
    reducedData = reducedData.slice(-3);
  }
  return reducedData;
}

export function processPollingData(
  pollingData,
  connections,
  {
    // eslint-disable-next-line no-unused-vars
    pingInterval = PING_INTERVAL,
    // eslint-disable-next-line no-unused-vars
    connTimeout = CONN_TIMEOUT,
    // eslint-disable-next-line no-unused-vars
    now = new Date(),
  } = {}
) {
  // cleanup stale data (to avoid very long arrays)
  [...pollingData.keys()].forEach((peerId) => {
    // avoid having large object in memory
    console.log(pollingData.get(peerId));
    const reducedData = reduceData(pollingData.get(peerId));
    pollingData.set(peerId, reducedData);
  });
  // todo next
  // if remote idle to long conn.disconnect + make sure to stop tracking the connection
  // remove the entry in pollingData
  // pollingData.get(peerId) should also get removed when the conn is disconnected any other way
}
