/* eslint-disable import/no-relative-packages */
import {
  PING_INTERVAL,
  __WEBRTC_REMOTE_CONTROL_PRIVATE_DATACHANNEL__,
} from "../../shared/common";

// todo makeStartLongPolling
export function startLongPolling(conn, pingInterval = PING_INTERVAL) {
  const timer = setInterval(() => {
    console.log(new Date(), conn.peer);
    if (conn) {
      conn.send({
        type: __WEBRTC_REMOTE_CONTROL_PRIVATE_DATACHANNEL__,
        action: "POLLING",
        payload: new Date(),
      });
    }
  }, pingInterval);
  return function cancelLongPolling() {
    clearInterval(timer);
  };
}
