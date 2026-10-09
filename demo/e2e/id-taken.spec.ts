import {
  expect,
  expectLatestEvents,
  expectLatestEventsUnordered,
  readEvents,
  test,
} from "./fixtures";

import type { Page } from "@playwright/test";

// The retry lives in the react and vue providers; the vanilla demo has none.
test.skip(
  ({ demoMode }) => demoMode === "vanilla",
  "the vanilla demo has no provider to retry",
);

const HOLD_MS = 3_500;

/**
 * Registers `id` on the local signaling server from Node, the way a page whose
 * socket the server has not seen close yet does. Rejects with the server's
 * answer when the id is still taken.
 */
function hold(id: string): Promise<WebSocket> {
  const socket = new WebSocket(
    `ws://localhost:9000/myapp/peerjs?key=peerjs&id=${id}&token=holder`,
  );
  return new Promise((resolve, reject) => {
    // Only the server's first answer: once the id is held, the remotes' offers
    // to it arrive on this socket too.
    socket.addEventListener(
      "message",
      (event) => {
        const { type } = JSON.parse(String(event.data)) as { type: string };
        if (type === "OPEN") {
          resolve(socket);
        } else {
          socket.close();
          reject(new Error(type));
        }
      },
      { once: true },
    );
    socket.addEventListener("error", () => reject(new Error("socket error")));
  });
}

/** Takes `id` as soon as the page that held it has left the server. */
async function holdOnceFree(id: string): Promise<WebSocket> {
  await expect
    .poll(() =>
      hold(id).then(
        (socket) => (socket.close(), true),
        () => false,
      ),
    )
    .toBe(true);
  return hold(id);
}

/** Every error message `<errors-display>` shows over `ms`, sampled every 100 ms. */
async function errorsShownDuring(page: Page, ms: number): Promise<string[]> {
  const seen = new Set<string>();
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const serialized = await page.evaluate(() =>
      JSON.stringify(document.querySelector("errors-display")?.data ?? []),
    );
    for (const message of JSON.parse(serialized) as string[]) {
      seen.add(message);
    }
    await page.waitForTimeout(100);
  }
  return [...seen];
}

/** The id of the page's latest `open`, which later events may have buried. */
async function openedId(page: Page): Promise<string | undefined> {
  return (await readEvents(page)).find(({ event }) => event === "open")?.payload
    .id;
}

async function countIdTaken(page: Page): Promise<number> {
  return (await readEvents(page)).filter(
    ({ event, error }) => event === "error" && error?.type === "unavailable-id",
  ).length;
}

/**
 * Leaves `page`, holds its peer id from Node and comes back to the same tab, so
 * the page reloads under its stored id while the server still answers
 * `ID-TAKEN`. Returns the errors shown while the id was held.
 */
async function reloadWhileIdHeld(page: Page, peerId: string) {
  const url = page.url();
  await page.goto("about:blank");
  const holder = await holdOnceFree(peerId);
  await page.goto(url);
  const shown = await errorsShownDuring(page, HOLD_MS);
  holder.close();
  return shown;
}

test("a remote refused its stored id retries quietly and gets it back", async ({
  demo,
}) => {
  const [remote] = demo.remotes;
  if (!remote) {
    throw new Error("the background did not connect three remotes");
  }

  const shown = await reloadWhileIdHeld(remote.page, remote.peerId);

  await expect.poll(() => openedId(remote.page)).toBe(remote.peerId);
  await expectLatestEvents(demo.masterPage, [
    { event: "remote.connect", payload: { id: remote.peerId } },
  ]);
  expect(await countIdTaken(remote.page)).toBeGreaterThan(0);
  expect(shown).toEqual([]);
});

test("a master refused its stored id retries quietly and gets it back", async ({
  demo,
}) => {
  const shown = await reloadWhileIdHeld(demo.masterPage, demo.masterPeerId);

  await expect.poll(() => openedId(demo.masterPage)).toBe(demo.masterPeerId);
  await expectLatestEventsUnordered(
    demo.masterPage,
    demo.remotes.map((remote) => ({
      event: "remote.connect",
      payload: { id: remote.peerId },
    })),
  );
  expect(await countIdTaken(demo.masterPage)).toBeGreaterThan(0);
  expect(shown).toEqual([]);
});
