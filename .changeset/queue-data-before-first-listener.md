---
"@webrtc-remote-control/core": patch
---

Deliver `data` received before the first `data` listener instead of dropping it, on both the master and the remote. Up to 100 messages are queued and handed to the listeners added in the same synchronous run as the first one. This fixes the React bindings losing a message sent right after the connection opened.
