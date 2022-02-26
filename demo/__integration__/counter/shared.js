import { getE2eTestServerAddress } from "../../test.helpers";

export function givenIVisitDemoHomePage(given) {
  given("I visit demo home page", async () => {
    await page.goto(getE2eTestServerAddress());
    await expect(page.title()).resolves.toMatch("webrtc-remote-control");
  });
}

export function givenIVisitMasterPage(given, pathname, title) {
  given("I visit master page", async () => {
    await page.goto(`${getE2eTestServerAddress()}${pathname}`);
    await expect(page.title()).resolves.toMatch(title);
  });
}

export function givenMasterPeerOpenEventIsTriggered(given) {
  given('[master] triggers "open" event', async () => {
    const logs = await page.evaluate(() => {
      return document.querySelector("console-display").data;
    });
    expect(logs[0].payload.event).toBe("open");
  });
}
