import { expect, test as base } from "@playwright/test";

import type { BrowserContext, Page } from "@playwright/test";

export interface Orientation {
  alpha: number;
  beta: number;
  gamma: number;
}

/** One entry of the master's list, as that page renders it. */
export interface ListedRemote extends Orientation {
  peerId: string;
}

export interface AccelerometerRemote {
  page: Page;
  peerId: string;
  /**
   * Starts feeding the page synthetic `deviceorientation` events with these
   * angles, replacing whatever it was sending before.
   */
  setOrientation(orientation: Orientation): Promise<void>;
}

export interface ConnectedAccelerometerDemo {
  masterPage: Page;
  masterPeerId: string;
  remotes: AccelerometerRemote[];
}

/** An event as the accelerometer demo logs it. */
export interface DemoEvent {
  event: string;
  payload?: { id: string };
}

declare global {
  interface Window {
    /** Filled by the init script below, in the order the page logged them. */
    __wrcEvents?: DemoEvent[];
    __orientationTimer?: number;
  }
}

const MASTER_URL = "/accelerometer-3d/index.html";
const MASTER_TITLE = "webrtc-remote-control / demo / accelerometer-3d";
const REMOTE_COUNT = 2;

/**
 * This page has no `<console-display>` - unlike the counter demos it logs to
 * the console - so the events have to be captured there. Wrapping `console`
 * from an init script rather than listening to Playwright's `console` event
 * keeps the payloads: a logged object reaches the test as "Object" through
 * `ConsoleMessage.text()`, and unwrapping it means a handle per message.
 */
async function recordEvents(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const events: DemoEvent[] = [];
    window.__wrcEvents = events;
    const record = (entry: unknown) => {
      if (entry && typeof entry === "object" && "event" in entry) {
        // The demo logs an `Error` on failure, which does not survive
        // `JSON.stringify`. Only the event name matters there.
        const { event, payload } = entry as DemoEvent;
        events.push(payload ? { event, payload } : { event });
      }
    };
    for (const level of ["log", "error"] as const) {
      const original = console[level].bind(console);
      console[level] = (...args: unknown[]) => {
        record(args[0]);
        original(...args);
      };
    }
  });
}

/**
 * Headless Chromium exposes `requestPermission` on both event constructors but
 * never settles the promise it returns, so the demo's permission gate hangs and
 * the remote never starts listening. Answer it the way an iOS grant would.
 */
async function grantDeviceOrientation(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const granted = () => Promise.resolve<PermissionState>("granted");
    // See `demo/types/device-orientation-permission.d.ts` - the member is
    // declared on its own and intersected at the point of use.
    (
      DeviceOrientationEvent as typeof DeviceOrientationEvent &
        PermissionRequestableEventConstructor
    ).requestPermission = granted;
    (
      DeviceMotionEvent as typeof DeviceMotionEvent &
        PermissionRequestableEventConstructor
    ).requestPermission = granted;
  });
}

export async function readEvents(page: Page): Promise<DemoEvent[]> {
  return page.evaluate(() => window.__wrcEvents ?? []);
}

/**
 * Asserts the order the events arrived in, by name only, oldest first. Runs of
 * the same event are collapsed for the reason `counter.spec.ts` gives: how many
 * `remote.reconnecting` entries an outage produces depends on how many attempts
 * it took.
 */
export async function expectEventSequence(
  page: Page,
  expected: string[],
): Promise<void> {
  const collapse = (events: DemoEvent[]) =>
    events
      .map((event) => event.event)
      .filter((name, index, names) => name !== names[index - 1]);
  await expect
    .poll(async () => collapse(await readEvents(page)).slice(-expected.length))
    .toEqual(expected);
}

/** Waits for a peer to open and returns the id it was given. */
export async function waitForPeerId(page: Page): Promise<string> {
  await expect
    .poll(async () =>
      (await readEvents(page)).some((entry) => entry.event === "open"),
    )
    .toBe(true);
  const opened = (await readEvents(page)).find(
    (entry) => entry.event === "open",
  );
  const id = opened?.payload?.id;
  if (!id) {
    throw new Error("the peer reported an open event without an id");
  }
  return id;
}

async function readRemotesList(page: Page): Promise<ListedRemote[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll("li")]
      .map((item) => {
        // The id and its copy button share a header row, so the id is no
        // longer a direct child of the entry - read it by its own class.
        const peerId =
          item.querySelector(":scope .remote-peer-id")?.textContent ?? "";
        const angles = Object.fromEntries(
          [...item.querySelectorAll(":scope ul > li")].map((angle) => {
            const [name, value] = (angle.textContent ?? "").split(": ");
            return [name, Number(value)];
          }),
        );
        return { peerId, ...angles };
      })
      .filter((entry): entry is ListedRemote => Boolean(entry.peerId)),
  );
}

/**
 * The master lists its remotes in whatever order they connected, and after it
 * reloads they rejoin in whatever order they win the race in, so the comparison
 * is unordered.
 */
export async function expectListedRemotes(
  masterPage: Page,
  expected: ListedRemote[],
): Promise<void> {
  const byPeerId = (a: ListedRemote, b: ListedRemote) =>
    a.peerId.localeCompare(b.peerId);
  await expect
    .poll(async () => [...(await readRemotesList(masterPage))].sort(byPeerId))
    .toEqual([...expected].sort(byPeerId));
}

/**
 * What the page currently shows in its error box, if anything. Read off the
 * `data` property, the way `fixtures.ts` reads the counter demo's elements.
 *
 * This page is react, and React 19 sets a prop on a custom element by checking
 * `name in element` and, when that holds, assigning the property -
 * `element.data = value` - rather than calling `setAttribute`. `errors-display`
 * has a `data` accessor, so that is the branch taken, and it does not mirror
 * the property back to the attribute. Nothing ever writes `data=` in the
 * markup: `getAttribute("data")` would answer `null` whatever the page shows,
 * and the assertion below would pass vacuously.
 */
export async function readErrors(page: Page): Promise<string[] | null> {
  return page.evaluate(
    () => document.querySelector("errors-display")?.data ?? null,
  );
}

async function openRemote(
  context: BrowserContext,
  masterPage: Page,
  href: string,
): Promise<AccelerometerRemote> {
  const page = await context.newPage();
  await recordEvents(page);
  await grantDeviceOrientation(page);
  await page.goto(href);
  await page.getByRole("button", { name: "Click here to start" }).click();

  const peerId = await waitForPeerId(page);
  await expect
    .poll(async () =>
      (await readEvents(masterPage)).some(
        (entry) =>
          entry.event === "remote.connect" && entry.payload?.id === peerId,
      ),
    )
    .toBe(true);

  return {
    page,
    peerId,
    async setOrientation(orientation) {
      // A phone fires `deviceorientation` continuously, so this does too. It is
      // the device being simulated, not a retry: the remote only sends when the
      // angles change, so a single dispatch would race the master's listener
      // after a reconnection.
      await page.evaluate((angles) => {
        window.clearInterval(window.__orientationTimer);
        window.__orientationTimer = window.setInterval(() => {
          window.dispatchEvent(
            new DeviceOrientationEvent("deviceorientation", angles),
          );
        }, 100);
      }, orientation);
    },
  };
}

export const test = base.extend<{ demo: ConnectedAccelerometerDemo }>({
  // Open the master page and connect two remotes, each holding a device
  // orientation of its own so the master's entries can be told apart.
  demo: async ({ context }, use) => {
    const masterPage = await context.newPage();
    await recordEvents(masterPage);
    await masterPage.goto(MASTER_URL);
    await expect(masterPage).toHaveTitle(MASTER_TITLE);
    const masterPeerId = await waitForPeerId(masterPage);

    // The master only fills the link in once its own peer is open, and its href
    // is a bare `#<peerId>` fragment, so read the resolved property.
    const link = masterPage.locator("a.open-remote");
    await expect
      .poll(() =>
        link.evaluate((el: HTMLAnchorElement) => el.getAttribute("href")),
      )
      .toBeTruthy();
    const href = await link.evaluate((el: HTMLAnchorElement) => el.href);

    const remotes: AccelerometerRemote[] = [];
    for (let index = 0; index < REMOTE_COUNT; index += 1) {
      remotes.push(await openRemote(context, masterPage, href));
    }

    await use({ masterPage, masterPeerId, remotes });
  },
});

export { expect } from "@playwright/test";
