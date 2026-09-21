import {
  connectAccelerometerDemo,
  countCanvases,
  expect,
  expectEventSequence,
  expectListedRemotes,
  readContextLosses,
  readErrors,
  test,
} from "./accelerometer.fixtures";

const FIRST = { alpha: 11.11, beta: 22.22, gamma: 33.33 };
const SECOND = { alpha: 44.44, beta: 55.55, gamma: 66.66 };

/** How many active WebGL contexts Chrome allows a page before evicting. */
const WEBGL_CONTEXT_CAP = 16;

test("streams the orientation of two remotes to the master", async ({
  demo,
}) => {
  const [first, second] = demo.remotes;
  if (!first || !second) {
    throw new Error("the fixture did not connect two remotes");
  }

  await first.setOrientation(FIRST);
  await second.setOrientation(SECOND);

  // Each remote's angles reach the master under that remote's own peer id,
  // which is the whole point of the page: one master, several phones.
  await expectListedRemotes(demo.masterPage, [
    { peerId: first.peerId, ...FIRST },
    { peerId: second.peerId, ...SECOND },
  ]);
});

test("keeps both remotes usable after the master reloads", async ({ demo }) => {
  const [first, second] = demo.remotes;
  if (!first || !second) {
    throw new Error("the fixture did not connect two remotes");
  }

  await first.setOrientation(FIRST);
  await second.setOrientation(SECOND);
  await expectListedRemotes(demo.masterPage, [
    { peerId: first.peerId, ...FIRST },
    { peerId: second.peerId, ...SECOND },
  ]);

  await demo.masterPage.reload();

  for (const remote of demo.remotes) {
    // `remote.reconnecting` sits between the two, which is what lets the page
    // show a notice instead of `humanizeError`'s advice to reload - the one
    // thing the user does not need to do mid-recovery.
    await expectEventSequence(remote.page, [
      "remote.disconnect",
      "remote.reconnecting",
      "remote.reconnect",
    ]);
    // And the notice is gone once the remote is back. A `peer-unavailable` left
    // on screen is not cosmetic here: it is what the page shows when it has
    // given up, so a recovered remote would still read as a dead one.
    await expect.poll(async () => readErrors(remote.page)).toBeNull();
  }

  // Coming back on the wire is not the same thing as being usable. The remotes
  // only send when their angles change, so these are new ones: the master
  // showing them is what proves the data channel carries traffic again.
  await first.setOrientation(SECOND);
  await second.setOrientation(FIRST);
  await expectListedRemotes(demo.masterPage, [
    { peerId: first.peerId, ...SECOND },
    { peerId: second.peerId, ...FIRST },
  ]);
});

/**
 * Chrome caps a page at 16 active WebGL contexts and evicts the oldest past
 * that, so a master that mounted one `<Canvas>` per phone broke at the 17th
 * remote: the evicted cards rendered as a broken-image glyph while their peer
 * id, angles and WebRTC traffic all kept working. That is why nothing here
 * caught it - every other assertion in this file reads text. So connect one
 * remote more than the cap and assert the two things the fix is: one context
 * for the whole page, and none of it lost.
 */
test("draws more phones than Chrome allows WebGL contexts", async ({
  context,
}) => {
  const demo = await connectAccelerometerDemo(context, WEBGL_CONTEXT_CAP + 1);

  // Every remote is listed - the page has to be whole before the canvas
  // assertions below mean anything. Angles are left at zero on purpose: 17 tabs
  // each dispatching `deviceorientation` on an interval is a lot of traffic to
  // buy nothing this scenario is about.
  await expectListedRemotes(
    demo.masterPage,
    demo.remotes.map((remote) => ({
      peerId: remote.peerId,
      alpha: 0,
      beta: 0,
      gamma: 0,
    })),
  );

  expect(await countCanvases(demo.masterPage)).toBe(1);
  expect(await readContextLosses(demo.masterPage)).toEqual([]);
});
