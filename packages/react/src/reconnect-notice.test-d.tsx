import React from "react";
import type { ReactNode } from "react";

import { RemoteProvider } from "./Provider.js";
import type { PeerInstance } from "./Provider.js";

/**
 * Compile-time guard, not a test: checked by `vp check`, never run. Named
 * `.test-d.tsx` so Vitest does not collect it, the way core's
 * `assignability.test-d.ts` is.
 *
 * What it pins down is the one shape that used to fail. `init` is
 * context-sensitive - `({ getPeerId }) => ...` is what every consumer writes -
 * so TypeScript defers it to a second inference pass, and to type its
 * parameter contextually it has to *fix* the provider's type parameters first.
 * If that parameter mentions them, they get fixed before `reconnectNotice` is
 * ever looked at, at their `string` default, and a message returning a React
 * node is then measured against `string`. Typing `init`'s utilities at
 * `unknown` is what keeps the two apart; this file fails to compile if that
 * ever regresses.
 */
const fakePeer = null as unknown as PeerInstance;

export const reactNodeNotice = (
  <RemoteProvider
    masterPeerId="master-peer-id"
    init={({ getPeerId }) => {
      getPeerId();
      return fakePeer;
    }}
    reconnectNotice={{
      reconnecting: <span>Reconnecting...</span>,
      stalled: ({ attempt }) => <strong>Gave up after {attempt}</strong>,
    }}
  >
    <div />
  </RemoteProvider>
);

/** The default wording still types as `string` when nothing is passed. */
export const defaultNotice = (
  <RemoteProvider
    masterPeerId="master-peer-id"
    init={({ getPeerId }) => {
      getPeerId();
      return fakePeer;
    }}
  >
    <div />
  </RemoteProvider>
);

const node: ReactNode = reactNodeNotice;
export default node;
