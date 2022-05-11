// eslint-disable-next-line import/no-relative-packages
import { PING_INTERVAL } from "../../shared/common";

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
