---
"@webrtc-remote-control/core": minor
---

Added a `remote.reconnecting` event and a `makeReconnectNotice` factory, so an
application can tell "coming back" from "gone" without knowing how the backoff
is tuned.

Now that the remote retries a lost connection, `peer-unavailable` on the `Peer`
became misleading on its own: it fires on an attempt that lost its race to the
master re-registering, says nothing about whether anything is still trying, and
the built-in message for it advises reloading the page - which is the one thing
the user does not need to do while a retry is in flight.

`remote.reconnecting` fires once per reconnection attempt, including the
immediate one, and carries `{ id, attempt, nextDelayMs }`. It is deliberately
**not** emitted for the first connection, which is not retried: a
`peer-unavailable` there really does mean the master id is wrong or gone, and
telling the user to reload is the honest answer - so the built-in message for
that error is unchanged.

`makeReconnectNotice` turns that payload into something to show, and owns the
judgement of when "reconnecting" stops being plausible. It is built the same way
as `makeHumanizeError` - optional overrides, built-in defaults - and
`prepareUtils` now hands out a `reconnectNotice` alongside `humanizeError`:

```js
const { reconnectNotice } = prepareUtils();
wrcRemote.on("remote.reconnecting", (payload) => {
  setStatus(reconnectNotice(payload));
});
wrcRemote.on("remote.reconnect", () => setStatus(null));
```

Either message can be overridden, as a value or as a function of the payload:

```js
makeReconnectNotice({
  reconnecting: "Hold on...",
  stalled: ({ attempt }) => `No answer after ${attempt} tries.`,
});
```

The threshold it switches on is the backoff ceiling, and it stays core's to
know. A consumer picks the wording, never the number - so retuning the backoff
in a later release cannot silently make anyone's copied comparison wrong. The
type parameters are inferred from the overrides, so returning something richer
than a string - a React node, say - needs no annotation and no cast.

Additive throughout: subscribing to an event name that did not exist was not
possible before, and `prepareUtils` gained a key rather than changing one.
