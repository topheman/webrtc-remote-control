---
"@webrtc-remote-control/vue": patch
---

Fix the release pipeline so published tarballs no longer carry literal pnpm protocol strings.

`0.2.0` shipped with `"@webrtc-remote-control/core": "workspace:^"` literally in `dependencies`, because the release script shelled out to `npm publish` on the raw package directory instead of `pnpm publish`, and npm's publish path never rewrites pnpm's `workspace:` protocol into a real version range. No registry resolves `workspace:^`, so `npm install @webrtc-remote-control/vue@0.2.0` failed outright for every consumer. `pnpm publish` performs that rewrite natively, so this release restores it.
