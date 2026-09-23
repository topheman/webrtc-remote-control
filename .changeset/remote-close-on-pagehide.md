---
"@webrtc-remote-control/core": patch
---

A remote now closes its connection on `pagehide` instead of `beforeunload`, which iOS Safari skips when it puts the page in the back/forward cache, so the master no longer keeps listing a remote that navigated away. When the page is restored from that cache, the remote reconnects, rejoining the signaling server first if it lost it.
