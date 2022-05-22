// eslint-disable-next-line import/no-relative-packages
import { CONN_TIMEOUT, PING_INTERVAL } from "../../shared/common";

function dateOrString(string) {
  const date = new Date(string);
  return Number.isNaN(date.getTime()) ? string : date;
}

// todo refactor rename
export function usePollingData(connections) {
  const pollingData = new Map();
  return {
    pushPollingData: (peerId, data) => {
      const result = dateOrString(data?.payload);
      if (pollingData.has(peerId)) {
        pollingData.get(peerId).push(result);
      } else {
        pollingData.set(peerId, result ? [result] : []);
      }
    },
    startHandlePollingData: () => {
      setInterval(() => {
        processPollingData(pollingData, connections);
      }, PING_INTERVAL * 2);
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
    reducedData = reducedData.slice(pauseIndex + 1);
    reducedData = ["PAUSE", ...reducedData.slice(-2)];
    return reducedData;
  }
  if (
    resumeIndex > -1 &&
    resumeIndex > pauseIndex &&
    reducedData.length > resumeIndex + 1
  ) {
    reducedData = reducedData.slice(resumeIndex + 1);
    reducedData = ["RESUME", ...reducedData.slice(-2)];
    return reducedData;
  }
  // only keep 3 entries at all times
  if (reducedData.length > 3) {
    reducedData = reducedData.slice(-3);
  }
  return reducedData;
}

function shouldDisconnect(
  data = [],
  { connTimeout = CONN_TIMEOUT, now = new Date() } = {}
) {
  const result = data.reduce(
    (acc, cur) => {
      switch (cur) {
        case "PAUSE":
          acc.pause = true;
          delete acc.date;
          break;
        case "RESUME":
          acc.pause = false;
          delete acc.date;
          break;
        default:
          acc.date = cur;
      }
      return acc;
    },
    {
      pause: false,
      date: undefined,
    }
  );
  if (result.pause || !result.date) {
    return false;
  }
  if (new Date(result.date.getTime() + connTimeout) < now) {
    return true;
  }
  return false;
}

export function processPollingData(
  pollingData,
  connections,
  {
    // eslint-disable-next-line no-unused-vars
    connTimeout = CONN_TIMEOUT,
    // eslint-disable-next-line no-unused-vars
    now = new Date(),
  } = {}
) {
  // cleanup stale data (to avoid very long arrays)
  [...pollingData.keys()].forEach((peerId) => {
    // avoid having large object in memory
    // console.dir(pollingData.get(peerId));
    const reducedData = reduceData(pollingData.get(peerId));
    if (shouldDisconnect(reducedData, { connTimeout, now })) {
      const conn = connections.find(
        (currentConn) => currentConn.peer === peerId
      );
      conn.disconnect();
      pollingData.delete(peerId);
    } else {
      pollingData.set(peerId, reducedData);
    }
  });
}
