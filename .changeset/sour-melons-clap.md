---
---

Move the monorepo from Lerna to pnpm workspaces and Changesets. No change to the published
package contents: the internal `workspace:^` dependencies are rewritten to real ranges at
publish time.
