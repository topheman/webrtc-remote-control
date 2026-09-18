import {
  expect,
  expectLatestEventSequence,
  expectLatestEvents,
  expectLatestEventsUnordered,
  expectRemoteCounters,
  expectRemoteCountersUnordered,
  test,
  waitForPeerId,
} from "./fixtures";

import type { DemoMode, RemotePeer } from "./fixtures";

const COUNTER_CONTROLS = {
  increment: ".counter-control-add",
  decrement: ".counter-control-sub",
} as const;

async function click(
  remote: RemotePeer,
  action: keyof typeof COUNTER_CONTROLS,
  times: number,
): Promise<void> {
  const control = remote.page.locator(COUNTER_CONTROLS[action]);
  for (let i = 0; i < times; i += 1) {
    await control.click();
  }
}

/**
 * Both roles store the id their peer was given, under a key namespaced by demo
 * mode, so a reload rejoins as the same peer. The reconnection scenario below
 * depends on it.
 */
async function expectStoredPeerId(
  { page, peerId }: { page: RemotePeer["page"]; peerId: string },
  mode: DemoMode,
): Promise<void> {
  const stored = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    `webrtc-remote-control-peer-id-${mode}`,
  );
  expect(stored).toBe(peerId);
}

test("connects three remotes to the master", async ({ demo }) => {
  // The fixture is the assertion: it opens the master, opens three remotes and
  // checks each one against the master's event log and remote list as it
  // arrives. All that is left is that every peer kept its id.
  await expectStoredPeerId(
    { page: demo.masterPage, peerId: demo.masterPeerId },
    demo.mode,
  );
  for (const remote of demo.remotes) {
    await expectStoredPeerId(remote, demo.mode);
  }
});

test("forwards each remote's counter events to the master", async ({
  demo,
}) => {
  const [first, second, third] = demo.remotes;
  if (!first || !second || !third) {
    throw new Error("the background did not connect three remotes");
  }

  await click(first, "increment", 3);
  await click(second, "increment", 5);
  await click(third, "decrement", 2);

  await expectRemoteCounters(demo.masterPage, demo.remotes, [3, 5, -2]);
});

test("reconnects peers after a reload", async ({ demo }) => {
  const reloaded = demo.remotes[1];
  if (!reloaded) {
    throw new Error("the background did not connect three remotes");
  }

  // A remote that reloads comes back on the same peer id, and the master sees
  // it drop and rejoin.
  await reloaded.page.reload();
  expect(await waitForPeerId(reloaded.page)).toBe(reloaded.peerId);
  await expectLatestEvents(demo.masterPage, [
    { event: "remote.connect", payload: { id: reloaded.peerId } },
    { event: "remote.disconnect", payload: { id: reloaded.peerId } },
  ]);

  // A master that reloads comes back on its own stored id, and every remote
  // finds its way back to it.
  await demo.masterPage.reload();
  await expectLatestEventsUnordered(
    demo.masterPage,
    demo.remotes.map((remote) => ({
      event: "remote.connect",
      payload: { id: remote.peerId },
    })),
  );
  for (const remote of demo.remotes) {
    // `remote.reconnecting` sits between the two now, which is the point of it:
    // an application has something to show while the retry loop runs, instead
    // of a `peer-unavailable` telling the user to reload mid-recovery.
    await expectLatestEventSequence(remote.page, [
      "remote.reconnect",
      "remote.reconnecting",
      "remote.disconnect",
    ]);
    await expectLatestEvents(remote.page, [
      { event: "remote.reconnect", payload: { id: remote.peerId } },
    ]);
  }

  // `remote.reconnect` firing is not the same thing as a usable remote: the
  // error a lost reconnection race puts on screen disables every control, so a
  // remote can come back on the wire and still be dead to the person holding
  // it. Driving the counter is what tells the two apart.
  //
  // Be honest about the reach of this, though. It does not gate that fix, and
  // it passes with the fix reverted - Chromium here wins the race the retry
  // used to lose, so `peer-unavailable` never fires and the control-disabling
  // state is never entered. Same blind spot as the reconnection scenario
  // itself. What it does guard is the cheaper direction: that a reconnected
  // remote still reaches the master at all.
  const [first, second, third] = demo.remotes;
  if (!first || !second || !third) {
    throw new Error("the background did not connect three remotes");
  }
  await click(first, "increment", 1);
  await click(third, "decrement", 1);

  await expectRemoteCountersUnordered(
    demo.masterPage,
    demo.remotes,
    [1, 0, -1],
  );
});
