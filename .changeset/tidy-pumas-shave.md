---
"@webrtc-remote-control/core": patch
"@webrtc-remote-control/react": patch
"@webrtc-remote-control/vue": patch
---

Point the peerjs `<script>` snippet in the README at 1.5.5 instead of 1.5.4.

Documentation only - no code in any of the three packages changes. peerjs 1.5.5
is a release-tooling fix with no runtime difference from 1.5.4, and the demo now
loads that version, so the copy-pasteable snippet matches what the demo actually
runs.
