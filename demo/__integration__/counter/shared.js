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
  let masterPeerId = null;
  given("[master] triggers open event", async () => {
    const logs = await page.evaluate(() => {
      return document.querySelector("console-display").data;
    });
    expect(logs[0].payload.event).toBe("open");

    // update `masterPeerId` so that it will be exposed
    masterPeerId = logs[0].payload.payload.id;
  });

  return function getMasterPeerId() {
    return masterPeerId;
  };
}

export function givenIOpenANewRemote(given) {
  let remotePeerId = null;
  given(
    "I open a new remote from master, it should trigger an open event on remote",
    async () => {
      const remoteHref = await page.evaluate(() => {
        return document.querySelector(".open-remote").href;
      });
      const remotePage = await browser.newPage();
      await remotePage.goto(remoteHref);
      await expect(remotePage.url()).toBe(remoteHref);

      // check the events on the remote page
      const remoteLogs = await remotePage.evaluate(() => {
        return document.querySelector("console-display").data;
      });
      expect(remoteLogs[0].payload.event).toBe("open");
      console.log((await browser.pages()).length);

      // update `remotePeerId` so that it will be exposed
      remotePeerId = remoteLogs[0].payload.payload.id;
    }
  );

  return function getRemotePeerId() {
    return remotePeerId;
  };
}
