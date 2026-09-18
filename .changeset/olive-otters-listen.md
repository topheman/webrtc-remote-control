---
"@webrtc-remote-control/core": minor
---

Added a `remote.reconnecting` event, so an application can tell "coming back"
from "gone".

Now that the remote retries a lost connection, `peer-unavailable` on the `Peer`
became misleading on its own: it fires on an attempt that lost its race to the
master re-registering, says nothing about whether anything is still trying, and
the built-in message for it advises reloading the page - which is the one thing
the user does not need to do while a retry is in flight.

The event fires once per reconnection attempt, including the immediate one, and
carries the attempt number with the delay that attempt is given before it is
abandoned:

```js
wrcRemote.on("remote.reconnecting", ({ id, attempt, nextDelayMs }) => {
  setStatus(
    nextDelayMs >= 8000
      ? `No answer after ${attempt} attempts - try reloading.`
      : "Lost connection, reconnecting...",
  );
});
wrcRemote.on("remote.reconnect", () => setStatus(null));
```

Because `nextDelayMs` stops growing once the backoff reaches its ceiling, an
application can hold a quiet notice while recovery is plausible and escalate
only when it stops being.

It is deliberately **not** emitted for the first connection, which is not
retried. A `peer-unavailable` there really does mean the master id is wrong or
gone, and telling the user to reload is the honest answer - so the built-in
message for that error is unchanged.

Additive: subscribing to an event name that did not exist was not possible
before, so no existing code changes meaning.
