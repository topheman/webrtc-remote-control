import { getE2eTestServerAddress, sleep } from "../../test.helpers";

const SAFE_TIMEOUT = 3;

export function getVisitInfosFromMode(mode) {
  const acceptedModes = ["react", "vanilla"];
  if (!acceptedModes.includes(mode)) {
    throw new Error(
      `mode ${mode} not supported, please pass one of ${acceptedModes.join(
        ", "
      )}`
    );
  }
  const infos = {
    vanilla: {
      url: "/counter-vanilla/master.html",
      title: "webrtc-remote-control / demo / vanilla / counter",
    },
    react: {
      url: "/counter-react/index.html",
      title: "webrtc-remote-control / demo / react / counter",
    },
  };
  return infos[mode];
}

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

    await sleep(SAFE_TIMEOUT);
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

      await sleep(SAFE_TIMEOUT);
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

    await sleep(SAFE_TIMEOUT);
  });
}

export function givenICloseEveryRemoteTabs(given, { getRemotes }) {
  given("I close every remotes", async () => {
    for (const getRemote of getRemotes()) {
      await getRemote().page.close();
    }
  });
}

export function givenIResetSessionStorage(given, { getRemotes }) {
  given("I reset the sessionStorage of master page", async () => {
    for (const getRemote of getRemotes()) {
      const peerIdInStorage = await getRemote().page.evaluate(() => {
        return sessionStorage.getItem("webrtc-remote-control-peer-id");
      });
      // check the correct peerId was stored in sessionStorage
      expect(peerIdInStorage).toBe(getRemote().peerId);
      // cleanup
      await getRemote().page.evaluate(() => {
        return sessionStorage.removeItem("webrtc-remote-control-peer-id");
      });
    }
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

/**
 * Will setup all the backgroud steps
 */
export function setupBackground(given, mode) {
  const infos = getVisitInfosFromMode(mode);
  const remotes = [];
  const getRemotes = () => remotes;
  const addRemote = (remote) => remotes.push(remote);
  const getRemote = (index) => remotes.at(index);
  givenIVisitDemoHomePage(given);
  givenIVisitMasterPage(given, infos.url, infos.title);
  const getMasterPeerId = givenMasterPeerOpenEventIsTriggered(given);

  addRemote(givenIOpenANewRemote(given));
  givenMasterAndRemoteEmitReceiveRemoteConnectEvent(given, {
    getRemote: getRemote(-1),
  });
  givenRemoteListShouldContain(given, { getRemotes });

  addRemote(givenIOpenANewRemote(given));
  givenMasterAndRemoteEmitReceiveRemoteConnectEvent(given, {
    getRemote: getRemote(-1),
  });
  givenRemoteListShouldContain(given, { getRemotes });

  addRemote(givenIOpenANewRemote(given));
  givenMasterAndRemoteEmitReceiveRemoteConnectEvent(given, {
    getRemote: getRemote(-1),
  });
  givenRemoteListShouldContain(given, { getRemotes });

  return {
    getRemotes,
    getRemote,
    addRemote,
    getMasterPeerId,
  };
}
