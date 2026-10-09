---
"@webrtc-remote-control/core": minor
"@webrtc-remote-control/react": minor
"@webrtc-remote-control/vue": minor
---

Retry a page whose stored peer id the signaling server still holds. A reload could reach the server before the old page's socket was gone; peerjs then destroyed the unopened peer and the page never connected. The react and vue providers now build a new peer under the same id with a growing delay, and take a fresh id after five refusals - once, and on a master only while the page is visible. `isIgnorableError` is `true` for those `unavailable-id` errors and is now handed out by `useMaster` too. Core's remote `isIgnorableError` also covers an `unavailable-id` met while reconnecting. Core exports `onIdTakenBeforeOpen`, `reconnectDelay` and `ID_TAKEN_MAX_ATTEMPTS` for applications without a provider.
