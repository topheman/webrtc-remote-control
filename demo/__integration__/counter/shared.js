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
  let remotePage = null;
  given(
    "I open a new remote from master, it should trigger an open event on remote",
    async () => {
      const remoteHref = await page.evaluate(() => {
        return document.querySelector(".open-remote").href;
      });
      remotePage = await browser.newPage();
      await remotePage.goto(remoteHref);
      await expect(remotePage.url()).toBe(remoteHref);

      // check the events on the remote page
      const remoteLogs = await remotePage.evaluate(() => {
        return document.querySelector("console-display").data;
      });
      expect(remoteLogs[0].payload.event).toBe("open");

      // update `remotePeerId` so that it will be exposed
      remotePeerId = remoteLogs[0].payload.payload.id;
    }
  );

  return function getRemote() {
    return {
      peerId: remotePeerId,
      page: remotePage,
    };
  };
}

export function givenMasterAndRemoteEmitReceiveRemoteConnectEvent(
  given,
  { getRemote }
) {
  given("[master] should receive remote.connect event", async () => {
    // check the events on the master page
    const masterLogs = await page.evaluate(() => {
      return document.querySelector("console-display").data;
    });
    expect(masterLogs[0].payload).toEqual({
      event: "remote.connect",
      payload: {
        id: getRemote().peerId,
      },
    });
  });
}

/**
 * Accepts in the feature a string "[0,1,2]" which will be matched to the counters
 * of the connected remotes.
 * No need to pass peerIds, they are derived via indexes.
 */
export function givenRemoteListShouldContain(given, { getRemotes }) {
  given(
    /^\[master\] remote lists should be "(.*)"$/,
    async (expectedSerializedRemoteCounters) => {
      // extract the counter list from the feature file and re-create an object-like
      // that was passed to <remotes-list/>
      const parsedRemoteCounters = JSON.parse(expectedSerializedRemoteCounters);
      const remotesListExpectedData = getRemotes().reduce(
        (acc, getRemote, index) => {
          if (getRemote().peerId) {
            acc.push({
              counter: parsedRemoteCounters[index],
              peerId: getRemote().peerId,
            });
          }
          return acc;
        },
        []
      );

      // match
      const remotesListCurrentData = await page.evaluate(() => {
        return document.querySelector("remotes-list").data;
      });
      expect(remotesListCurrentData).toEqual(remotesListExpectedData);
    }
  );
}
