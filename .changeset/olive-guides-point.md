---
"@webrtc-remote-control/core": patch
"@webrtc-remote-control/react": patch
---

Point the READMEs at the demo sources that exist, and at the React LLM guide.

Documentation only - no code in either package changes.

The "direct link to source code" line still pointed at `master.js` / `remote.js`
in core and `App.jsx` / `Master.jsx` / `Remote.jsx` in react. The demo was
ported to TypeScript, so all five of those links were 404s.

`@webrtc-remote-control/react` also gains a short section pointing at
`demo/counter-react/llm.md`, a guide written for coding assistants. It covers
what the declarations cannot: that the mode is derived from the URL hash, what
`sessionStorageKey` buys you on reload, and which responsibilities sit with the
package rather than with the application embedding it.
