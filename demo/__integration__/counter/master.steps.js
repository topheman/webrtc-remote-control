import { getE2eTestServerAddress, sleep } from "../../test.helpers";

describe.skip("counter/master", () => {
  // eslint-disable-next-line no-unused-vars
  let masterPeerId = null;
  // eslint-disable-next-line no-unused-vars
  const remotePeerIds = [];
  // eslint-disable-next-line no-unused-vars
  const remotePages = [];

  // label are steps not "it"
  test("Check server", async () => {
    await page.goto(getE2eTestServerAddress());
    await expect(page.title()).resolves.toMatch("webrtc-remote-control");
    console.log((await browser.pages()).length);
  });

  test('[master] should have triggered native "open" peerjs event', async () => {
    await page.goto(`${getE2eTestServerAddress()}/counter-vanilla/master.html`);
    await expect(page.title()).resolves.toMatch(
      "webrtc-remote-control / demo / vanilla / counter"
    );
    const logs = await page.evaluate(() => {
      return document.querySelector("console-display").data;
    });
    expect(logs[0].payload.event).toBe("open");
    masterPeerId = logs[0].payload.id;
    console.log((await browser.pages()).length);
  });

  test('[master/remote] should receive/emit "remote.connect" on first remote', async () => {
    await expect(page.title()).resolves.toMatch(
      "webrtc-remote-control / demo / vanilla / counter"
    );
    const remoteHref = await page.evaluate(() => {
      return document.querySelector(".open-remote").href;
    });
    const remotePage = await browser.newPage();
    await remotePage.goto(remoteHref);
    await expect(remotePage.url()).toBe(remoteHref);

    // check the events on the master page
    const masterLogs = await page.evaluate(() => {
      return document.querySelector("console-display").data;
    });
    expect(masterLogs[0].payload.event).toBe("remote.connect");
    expect(masterLogs[0].payload.payload.id).toBeTruthy();
    const remotePeerId = masterLogs[0].payload.payload.id;

    await sleep(1);

    // check the events on the remote page
    const remoteLogs = await remotePage.evaluate(() => {
      return document.querySelector("console-display").data;
    });
    expect(remoteLogs[0].payload.event).toBe("open");
    expect(remoteLogs[0].payload.payload).toEqual({
      id: remotePeerId,
    });
  });
});
