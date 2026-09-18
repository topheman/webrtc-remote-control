import { expect, test as base } from "@playwright/test";

import type { BrowserContext, Page } from "@playwright/test";

export type DemoMode = "vanilla" | "react" | "vue";

/** Set per Playwright project, one project per demo mode. */
export interface DemoOptions {
  demoMode: DemoMode;
}

/** An event as the demos push it into `<console-display>`. */
export interface DemoEvent {
  event: string;
  payload: { id: string };
  /**
   * Only the `open` event carries one, which is why that event is matched
   * through `waitForPeerId` rather than compared whole.
   */
  comment?: string;
}

export interface RemotePeer {
  page: Page;
  peerId: string;
}

export interface ConnectedDemo {
  mode: DemoMode;
  masterPage: Page;
  masterPeerId: string;
  /** The three remotes opened by the background, in the order they connected. */
  remotes: RemotePeer[];
}

const MASTER_PAGES: Record<DemoMode, { url: string; title: string }> = {
  vanilla: {
    url: "/counter-vanilla/master.html",
    title: "webrtc-remote-control / demo / vanilla / counter",
  },
  react: {
    url: "/counter-react/index.html",
    title: "webrtc-remote-control / demo / react / counter",
  },
  vue: {
    url: "/counter-vue/index.html",
    title: "webrtc-remote-control / demo / vue / counter",
  },
};

const REMOTE_COUNT = 3;

/**
 * The demos hand `<console-display>` a plain array, but the vue one hands it a
 * reactive proxy, which does not survive Playwright's structured clone. Both
 * survive `JSON.stringify` inside the page, which is what the Jest suite did
 * too.
 */
async function readEvents(page: Page): Promise<DemoEvent[]> {
  const serialized = await page.evaluate(() =>
    JSON.stringify(document.querySelector("console-display")?.data ?? []),
  );
  const entries = JSON.parse(serialized) as { payload: DemoEvent }[];
  return entries.map((entry) => entry.payload);
}

async function readRemotesList(page: Page): Promise<unknown> {
  const serialized = await page.evaluate(() =>
    JSON.stringify(document.querySelector("remotes-list")?.data ?? []),
  );
  return JSON.parse(serialized) as unknown;
}

/**
 * `<console-display>` shows the newest event first, so `expected[0]` is the
 * most recent one. Waits for the events to arrive rather than sleeping for a
 * fixed budget first.
 */
export async function expectLatestEvents(
  page: Page,
  expected: DemoEvent[],
): Promise<void> {
  await expect
    .poll(async () => (await readEvents(page)).slice(0, expected.length))
    .toEqual(expected);
}

/**
 * The same, for a batch of events that all land at once and whose order is not
 * meaningful - the three `remote.connect` events a reloaded master receives.
 */
export async function expectLatestEventsUnordered(
  page: Page,
  expected: DemoEvent[],
): Promise<void> {
  const byId = (events: DemoEvent[]) =>
    [...events].sort((a, b) => a.payload.id.localeCompare(b.payload.id));
  await expect
    .poll(async () => byId((await readEvents(page)).slice(0, expected.length)))
    .toEqual(byId(expected));
}

/**
 * Asserts the order the latest events arrived in, by name only.
 *
 * Runs of the same event are collapsed first, because how many
 * `remote.reconnecting` entries an outage produces depends on how many
 * attempts it took - one here, more on a loaded machine. The sequence is the
 * meaningful part; pinning the count would only buy a flaky test. The payloads
 * of that event are pinned precisely in core's unit tests instead.
 */
export async function expectLatestEventSequence(
  page: Page,
  expected: string[],
): Promise<void> {
  const collapse = (events: DemoEvent[]) =>
    events
      .map((event) => event.event)
      .filter((name, index, names) => name !== names[index - 1]);
  await expect
    .poll(async () =>
      collapse(await readEvents(page)).slice(0, expected.length),
    )
    .toEqual(expected);
}

/** Waits for a peer to open and returns the id it was given. */
export async function waitForPeerId(page: Page): Promise<string> {
  await expect
    .poll(async () => (await readEvents(page))[0]?.event)
    .toBe("open");
  const opened = (await readEvents(page))[0];
  if (opened?.event !== "open") {
    throw new Error("the peer reported an open event and then lost it");
  }
  return opened.payload.id;
}

export async function expectRemoteCounters(
  masterPage: Page,
  remotes: RemotePeer[],
  counters: number[],
): Promise<void> {
  const expected = remotes.slice(0, counters.length).map((remote, index) => ({
    counter: counters[index],
    peerId: remote.peerId,
  }));
  await expect.poll(async () => readRemotesList(masterPage)).toEqual(expected);
}

/**
 * The same assertion, without depending on the order the master lists remotes
 * in. After the master reloads, its remotes rejoin in whatever order they win
 * the race in, so only an unordered comparison is stable there.
 */
export async function expectRemoteCountersUnordered(
  masterPage: Page,
  remotes: RemotePeer[],
  counters: number[],
): Promise<void> {
  const byPeerId = (a: { peerId: string }, b: { peerId: string }) =>
    a.peerId.localeCompare(b.peerId);
  const expected = remotes
    .slice(0, counters.length)
    .map((remote, index) => ({
      counter: counters[index],
      peerId: remote.peerId,
    }))
    .sort(byPeerId);
  await expect
    .poll(async () => {
      const actual = await readRemotesList(masterPage);
      return Array.isArray(actual)
        ? [...(actual as { peerId: string }[])].sort(byPeerId)
        : actual;
    })
    .toEqual(expected);
}

/**
 * Every peer is its own tab of one browser context, which is how the Jest suite
 * ran too: Chromium keeps sessionStorage per tab, so each peer gets its own
 * stored id even though they share a context.
 */
async function openRemote(
  context: BrowserContext,
  masterPage: Page,
): Promise<RemotePeer> {
  const link = masterPage.locator(".open-remote");
  // The master only fills the link in once its own peer is open. In the react
  // and vue demos the href is a bare `#<peerId>` fragment on the master's own
  // url, so read the resolved property rather than the attribute.
  await expect
    .poll(() =>
      link.evaluate((el: HTMLAnchorElement) => el.getAttribute("href")),
    )
    .toBeTruthy();
  const href = await link.evaluate((el: HTMLAnchorElement) => el.href);

  const page = await context.newPage();
  await page.goto(href);
  const peerId = await waitForPeerId(page);
  await expectLatestEvents(masterPage, [
    { event: "remote.connect", payload: { id: peerId } },
  ]);
  return { page, peerId };
}

export const test = base.extend<DemoOptions & { demo: ConnectedDemo }>({
  demoMode: ["vanilla", { option: true }],

  // The Background of the old `connection.feature`: open the demo home page and
  // the master page, then connect three remotes. Teardown is Playwright's -
  // closing the context closes every page, which is what "I close every pages"
  // did by hand.
  demo: async ({ context, demoMode }, use) => {
    const { url, title } = MASTER_PAGES[demoMode];

    const homePage = await context.newPage();
    await homePage.goto("/");
    await expect(homePage).toHaveTitle(/webrtc-remote-control/);

    const masterPage = await context.newPage();
    await masterPage.goto(url);
    await expect(masterPage).toHaveTitle(title);
    const masterPeerId = await waitForPeerId(masterPage);

    const remotes: RemotePeer[] = [];
    for (let index = 0; index < REMOTE_COUNT; index += 1) {
      remotes.push(await openRemote(context, masterPage));
      await expectRemoteCounters(
        masterPage,
        remotes,
        remotes.map(() => 0),
      );
    }

    await use({ mode: demoMode, masterPage, masterPeerId, remotes });
  },
});

export { expect } from "@playwright/test";
