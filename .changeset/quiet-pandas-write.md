---
"@webrtc-remote-control/vue": patch
---

The README now points at a guide written for coding assistants,
`demo/counter-vue/llm.md`, the way the react README already did for its own. It
covers what the types cannot say: that the mode comes from the URL hash, what
`sessionStorageKey` buys you on reload, how `state` narrows `api` and `peer`,
what the QR code has to encode, and how `reconnectNotice` and
`isIgnorableError` fit together during an outage.
