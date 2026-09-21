import { defineComponent, h } from "vue";
import type { VNode } from "vue";

import { provideRemote } from "./Provider.js";
import type { PeerInstance } from "./Provider.js";

/**
 * Compile-time guard, not a test: checked by `vp check`, never run. Named
 * `.test-d.ts` so Vitest does not collect it, the way core's
 * `assignability.test-d.ts` is. The react package carries the same file.
 *
 * `init` is context-sensitive - `(utils) => new Peer(utils.getPeerId())` is
 * what every consumer writes - so TypeScript defers it and, to type its
 * parameter contextually, has to *fix* `provideRemote`'s type parameters
 * first. If that parameter mentioned them they would be fixed at their
 * `string` default before the options are looked at, and a message returning a
 * `VNode` would be measured against `string`. Typing `init`'s utilities at
 * `unknown` is what keeps the two apart; this file fails to compile if that
 * ever regresses.
 */
const fakePeer = null as unknown as PeerInstance;

export const vnodeNotice = defineComponent({
  setup() {
    provideRemote(
      (utils) => {
        utils.getPeerId();
        return fakePeer;
      },
      {
        masterPeerId: "master-peer-id",
        reconnectNotice: {
          reconnecting: h("span", "Reconnecting...") as VNode,
          stalled: ({ attempt }) => h("strong", `Gave up after ${attempt}`),
        },
      },
    );
  },
  render: () => h("div"),
});

/** The default wording still types as `string` when nothing is passed. */
export const defaultNotice = defineComponent({
  setup() {
    provideRemote(
      (utils) => {
        utils.getPeerId();
        return fakePeer;
      },
      { masterPeerId: "master-peer-id" },
    );
  },
  render: () => h("div"),
});
