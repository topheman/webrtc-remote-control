import {
  expect,
  expectEventSequence,
  expectListedRemotes,
  readErrors,
  test,
} from "./accelerometer.fixtures";

const FIRST = { alpha: 11.11, beta: 22.22, gamma: 33.33 };
const SECOND = { alpha: 44.44, beta: 55.55, gamma: 66.66 };

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
