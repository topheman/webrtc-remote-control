---
"@webrtc-remote-control/core": patch
---

Fix the release pipeline so published tarballs no longer carry literal pnpm protocol strings.

`0.2.0` shipped with `vite` and `vite-plus` still pinned to `catalog:` in `devDependencies`, because the release script shelled out to `npm publish` on the raw package directory instead of `pnpm publish`, and npm's publish path never rewrites pnpm's `workspace:`/`catalog:` protocols. This is cosmetic for `@webrtc-remote-control/core` - `devDependencies` are never installed by a consumer - but it is wrong metadata on the published package. `pnpm publish` performs that rewrite natively, so this release restores it.
