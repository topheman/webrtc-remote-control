---
"@webrtc-remote-control/core": patch
---

A remote now retries a first connection that never opens, on the same backoff as a reconnection, instead of leaving `bindConnection` pending forever when ICE stalls. A `peer-unavailable` before the first open still means the master id is wrong or gone, so it ends the retries and `isIgnorableError` keeps returning `false` for it.
