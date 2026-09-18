import type { WrcRemoteEvents } from "@webrtc-remote-control/core/remote";

type ReconnectingPayload = Parameters<
  WrcRemoteEvents["remote.reconnecting"]
>[0];

/**
 * Core caps its reconnection backoff, so an attempt handed the ceiling delay is
 * one in a run that has already been failing for several seconds. That is the
 * point where "hold on" stops being honest and the master is probably not
 * coming back on its own.
 */
const RECONNECT_CEILING_MS = 8000;

/**
 * What to put on screen while the remote is reconnecting.
 *
 * The distinction this exists to draw: `peer-unavailable` on its own cannot
 * tell a user whether anything is still trying. Telling them to reload on the
 * first one - which is what the demo used to do - is wrong now that core
 * retries, because reloading is exactly what they do not need to do.
 */
export function reconnectNotice({
  attempt,
  nextDelayMs,
}: ReconnectingPayload): string {
  if (nextDelayMs >= RECONNECT_CEILING_MS) {
    return `Still no answer from the master after ${attempt} attempts. It may be gone for good - try reloading this page.`;
  }
  return "Lost connection to the master, reconnecting...";
}
