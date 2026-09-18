---
"@webrtc-remote-control/core": patch
---

The remote now retries a lost connection with exponential backoff instead of
exactly once.

Reloading a master used to be decided by a race. The remote saw its connection
close, rebuilt it immediately, and that single attempt landed while the master's
peer id was still unregistered with the signaling server. PeerJS answers that
with `peer-unavailable` on the `Peer`, so the connection it handed back never
opened and never closed - and a retry loop driven by `close` alone has nothing
left to react to. The remote stayed dead until the user reloaded it by hand.

The first retry is still immediate, so the common case where the master is still
there is unchanged. What is new is that an attempt which has not opened is now
abandoned on a deadline and tried again, waiting 1s, 2s, 4s and then 8s between
attempts. An outage emits one `remote.disconnect`, however many attempts it
takes, and `remote.reconnect` when one of them opens; the delay resets so a
later outage starts from 1s again.

Two deliberate differences from how 0.2.0 announced this fix:

- **The retry is not bounded.** Giving up after N attempts leaves the remote in
  the state the bug was reported for - dead until someone reloads the page. The
  cap is on the delay instead, so a remote left open on a phone costs one
  connection attempt every 8s and recovers on its own whenever the master comes
  back.
- **The trigger is a deadline, not the `peer-unavailable` error.** That error
  arrives on the `Peer`, which the consuming application owns and the library is
  not otherwise a listener on, and it identifies the unreachable peer only in
  its message text. A deadline covers `peer-unavailable` and an attempt that
  stalls with no error at all, without the library reaching into an object it
  was only lent.
