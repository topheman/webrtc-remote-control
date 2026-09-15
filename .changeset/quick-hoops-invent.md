---
---

Replace ESLint, Prettier, husky, lint-staged and npm-run-all with Vite+, whose
`lint`, `fmt`, `staged` and `test` blocks all live in a single root
`vite.config.ts`. No change to the published package contents beyond a more
precise parameter type on the hand-written `isConnectionFromRemote` declaration
in `@webrtc-remote-control/core`.
