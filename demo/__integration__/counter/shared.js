import { getE2eTestServerAddress, sleep } from "../../test.helpers";

const SAFE_TIMEOUT = 3;
const NEXT_TICK = 20;

/**
 * Accept flags
 * - `CI=true`
 * - `WEBRTC_CONNECTION_TIMEOUT=1000`
 */
const DEFAULT_WEBRTC_CONNECTION_TIMEOUT = process.env.CI ? 3000 : 600;
const WEBRTC_CONNECTION_TIMEOUT = Number.isNaN(
  Number(process.env.WEBRTC_CONNECTION_TIMEOUT)
)
  ? DEFAULT_WEBRTC_CONNECTION_TIMEOUT
  : Number(process.env.WEBRTC_CONNECTION_TIMEOUT);

export function getVisitInfosFromMode(mode) {
  const acceptedModes = ["react", "vanilla", "vue"];
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
    vue: {
      url: "/counter-vue/index.html",
      title: "webrtc-remote-control / demo / vue / counter",
    },
  };
  return infos[mode];
}

export function givenIVisitDemoHomePage(given) {
  let masterPage = null;
  given("I visit demo home page", async () => {
    masterPage = await browser.newPage();
    await page.goto(getE2eTestServerAddress());
    await expect(page.title()).resolves.toMatch("webrtc-remote-control");
  });
  return {
    getMasterPage() {
      return masterPage;
    },
  };
}

export function givenIVisitMasterPage(
  given,
  pathname,
  title,
  { getMasterPage }
) {
  given("I visit master page", async () => {
    await getMasterPage().goto(`${getE2eTestServerAddress()}${pathname}`);
    await expect(getMasterPage().title()).resolves.toMatch(title);
  });
}

export function givenMasterPeerOpenEventIsTriggered(given, { getMasterPage }) {
  let masterPeerId = null;
  given("[master] triggers open event", async () => {
    await sleep(WEBRTC_CONNECTION_TIMEOUT);
    const logs = await getMasterPage().evaluate(() => {
      // JSON.parse(JSON.stringify(...)) to unwrap vue Proxies
      return JSON.parse(
        JSON.stringify(document.querySelector("console-display").data)
      );
    });
    try {
      expect(logs.length).toBeGreaterThan(0);
    } catch (e) {
      throw new Error(
        `No events detected in console-display, check your connection / add a sleep before the assertion, or set the env var WEBRTC_CONNECTION_TIMEOUT=1000`
      );
    }
    expect(logs[0].payload.event).toBe("open");

    // update `masterPeerId` so that it will be exposed
    masterPeerId = logs[0].payload.payload.id;

    await sleep(SAFE_TIMEOUT);
  });

  return function getMasterPeerId() {
    return masterPeerId;
  };
}

export function givenIOpenANewRemote(given, { getMasterPage }) {
  let remotePeerId = null;
  let remotePage = null;
  given(
    "I open a new remote from master, it should trigger an open event on remote",
    async () => {
      const remoteHref = await getMasterPage().evaluate(() => {
        return document.querySelector(".open-remote").href;
      });
      remotePage = await browser.newPage();
      await remotePage.goto(remoteHref);
      await expect(remotePage.url()).toBe(remoteHref);

      // check the events on the remote page
      await sleep(WEBRTC_CONNECTION_TIMEOUT);
      const remoteLogs = await remotePage.evaluate(() => {
        return JSON.parse(
          JSON.stringify(document.querySelector("console-display").data)
        );
      });
      try {
        expect(remoteLogs.length).toBeGreaterThan(0);
      } catch (e) {
        throw new Error(
          `No events detected in console-display, check your connection / add a sleep before the assertion, or set the env var WEBRTC_CONNECTION_TIMEOUT=1000.`
        );
      }
      expect(remoteLogs[0].payload.event).toBe("open");

      // update `remotePeerId` so that it will be exposed
      remotePeerId = remoteLogs[0].payload.payload.id;

      await sleep(SAFE_TIMEOUT);
    }
  );

  return function getCurrentRemote() {
    return {
      peerId: remotePeerId,
      page: remotePage,
    };
  };
}

export function givenMasterAndRemoteEmitReceiveRemoteConnectEvent(
  given,
  { getCurrentRemote, getMasterPage }
) {
  given("[master] should receive remote.connect event", async () => {
    // check the events on the master page
    const masterLogs = await getMasterPage().evaluate(() => {
      return JSON.parse(
        JSON.stringify(document.querySelector("console-display").data)
      );
    });
    try {
      expect(masterLogs.length).toBeGreaterThan(0);
    } catch (e) {
      throw new Error(
        `No events detected in console-display, check your connection / add a sleep before the assertion, or set the env var WEBRTC_CONNECTION_TIMEOUT=1000.`
      );
    }
    expect(masterLogs[0].payload).toEqual({
      event: "remote.connect",
      payload: {
        id: getCurrentRemote().peerId,
      },
    });

    await sleep(SAFE_TIMEOUT);
  });
}

export function givenICloseEveryPages(given, { getAllRemotes, getMasterPage }) {
  given("I close every pages", async () => {
    for (const getCurrentRemote of getAllRemotes()) {
      await getCurrentRemote().page.close();
    }
    await getMasterPage().close();
  });
}

export function givenIResetSessionStorage(
  given,
  mode,
  { getAllRemotes, getMasterPage, getMasterPeerId }
) {
  given("I reset the sessionStorage of every pages", async () => {
    // remote pages
    for (const getCurrentRemote of getAllRemotes()) {
      await getCurrentRemote().page.exposeFunction(
        "fromPuppeteerGetSessionStorageKey",
        () => `webrtc-remote-control-peer-id-${mode}`
      );
      const peerIdInStorage = await getCurrentRemote().page.evaluate(
        async () => {
          const sessionStorageKey =
            await window.fromPuppeteerGetSessionStorageKey();
          return sessionStorage.getItem(sessionStorageKey);
        }
      );
      // check the correct peerId was stored in sessionStorage
      expect(peerIdInStorage).toContain(getCurrentRemote().peerId);
      // cleanup
      await getCurrentRemote().page.evaluate(async () => {
        const sessionStorageKey =
          await window.fromPuppeteerGetSessionStorageKey();
        return sessionStorage.removeItem(sessionStorageKey);
      });
    }

    // master pages
    await getMasterPage().exposeFunction(
      "fromPuppeteerGetSessionStorageKey",
      () => `webrtc-remote-control-peer-id-${mode}`
    );
    const masterPeerIdInStorage = await getMasterPage().evaluate(async () => {
      const sessionStorageKey =
        await window.fromPuppeteerGetSessionStorageKey();
      return sessionStorage.getItem(sessionStorageKey);
    });
    // check the correct peerId was stored in sessionStorage
    expect(masterPeerIdInStorage).toBe(getMasterPeerId());
    // cleanup
    await getMasterPage().evaluate(async () => {
      const sessionStorageKey =
        await window.fromPuppeteerGetSessionStorageKey();
      return sessionStorage.removeItem(sessionStorageKey);
    });
  });
}

/**
 * Accepts in the feature a string "[0,1,2]" which will be matched to the counters
 * of the connected remotes.
 * No need to pass peerIds, they are derived via indexes.
 */
export function givenRemoteListShouldContain(
  given,
  { getAllRemotes, getMasterPage }
) {
  given(
    /^\[master\] remote lists should be "(.*)"$/,
    async (expectedSerializedRemoteCounters) => {
      await sleep(NEXT_TICK);
      // extract the counter list from the feature file and re-create an object-like
      // that was passed to <remotes-list/>
      const parsedRemoteCounters = JSON.parse(expectedSerializedRemoteCounters);
      const remotesListExpectedData = getAllRemotes().reduce(
        (acc, getCurrentRemote, index) => {
          if (getCurrentRemote().peerId) {
            if (typeof parsedRemoteCounters[index] !== "undefined") {
              acc.push({
                counter: parsedRemoteCounters[index],
                peerId: getCurrentRemote().peerId,
              });
            }
          }
          return acc;
        },
        []
      );

      // match
      const remotesListCurrentData = await getMasterPage().evaluate(() => {
        return JSON.parse(
          JSON.stringify(document.querySelector("remotes-list").data)
        );
      });
      expect(remotesListCurrentData).toEqual(remotesListExpectedData);
    }
  );
}

/**
 * I click on (increment|decrement) X times on remote Y
 */
export function giventIClickTimesOnRemote(given, { getRemote }) {
  given(
    /^I click on (increment|decrement) (\d+) times on remote (\d+)$/,
    async (mode, times, remoteIndex) => {
      /**
       * We need to pass `selector` and `times` to puppeteer context
       */
      const fromPuppeteer = () => {
        const mapping = {
          increment: ".counter-control-add",
          decrement: ".counter-control-sub",
        };
        return {
          times: Number(times),
          selector: mapping[mode],
        };
      };
      await getRemote(Number(remoteIndex))().page.exposeFunction(
        "fromPuppeteer",
        fromPuppeteer
      );
      await getRemote(Number(remoteIndex))().page.evaluate(async () => {
        // eslint-disable-next-line no-shadow
        const { times, selector } = await window.fromPuppeteer();
        for (let i = 0; i < times; i++) {
          document.querySelector(selector).click();
        }
      });

      await sleep(SAFE_TIMEOUT);
    }
  );
}

export function givenIReloadARemoteThenMasterShouldReceiveDisconnectEvent(
  given,
  { getRemote, getMasterPage }
) {
  given(
    /^I reload remote (\d+) then master should receive remote.disconnect\/remote.connect event$/,
    async (remoteIndex) => {
      const remotePeerId = getRemote(remoteIndex)().peerId;
      await getRemote(remoteIndex)().page.reload();
      await sleep(WEBRTC_CONNECTION_TIMEOUT);
      const remoteLogs = await getRemote(remoteIndex)().page.evaluate(
        async () => {
          return JSON.parse(
            JSON.stringify(document.querySelector("console-display").data)
          );
        }
      );
      try {
        expect(remoteLogs.length).toBeGreaterThan(0);
      } catch (e) {
        throw new Error(
          `No events detected in console-display, check your connection / add a sleep before the assertion, or set the env var WEBRTC_CONNECTION_TIMEOUT=1000.`
        );
      }
      // remote should re-open and re-use the same id
      expect(remoteLogs[0].payload.event).toBe("open");
      expect(remoteLogs[0].payload.payload.id).toBe(remotePeerId);

      // master should receive remote.disconnect/remote.connect
      const masterLogs = await getMasterPage().evaluate(async () => {
        return JSON.parse(
          JSON.stringify(document.querySelector("console-display").data)
        );
      });
      expect(masterLogs[1].payload).toEqual({
        event: "remote.disconnect",
        payload: {
          id: remotePeerId,
        },
      });
      expect(masterLogs[0].payload).toEqual({
        event: "remote.connect",
        payload: {
          id: remotePeerId,
        },
      });

      await sleep(SAFE_TIMEOUT);
    }
  );
}

export function givenIReloadMasterThenRemotesShouldReconnect(
  given,
  { getAllRemotes, getMasterPage }
) {
  given(
    "I reload master then all remotes should receive remote.disconnect/remote.reconnect",
    async () => {
      const expectedEventsOnMaster = getAllRemotes()
        .map((getRemote) => ({
          event: "remote.connect",
          payload: {
            id: getRemote().peerId,
          },
        }))
        .sort((a, b) => (a.payload.id > b.payload.id ? -1 : 1));
      await getMasterPage().reload();
      await sleep(SAFE_TIMEOUT * 100);

      // check remote connecting on master
      await sleep(WEBRTC_CONNECTION_TIMEOUT);
      const masterLogs = await getMasterPage().evaluate(async () => {
        return JSON.parse(
          JSON.stringify(document.querySelector("console-display").data)
        );
      });
      try {
        expect(masterLogs.length).toBeGreaterThan(0);
      } catch (e) {
        throw new Error(
          `No events detected in console-display, check your connection / add a sleep before the assertion, or set the env var WEBRTC_CONNECTION_TIMEOUT=1000.`
        );
      }
      const received = masterLogs
        .slice(0, 3)
        .map(({ payload }) => payload)
        .sort((a, b) => (a.payload.id > b.payload.id ? -1 : 1));
      expect(received).toEqual(expectedEventsOnMaster);

      // check on each remote if they receive remote.disconnect/remote.reconnect
      for (const getCurrentRemote of getAllRemotes()) {
        await sleep(WEBRTC_CONNECTION_TIMEOUT);
        const remoteLogs = await getCurrentRemote().page.evaluate(async () => {
          return JSON.parse(
            JSON.stringify(document.querySelector("console-display").data)
          );
        });
        try {
          expect(remoteLogs.length).toBeGreaterThan(0);
        } catch (e) {
          throw new Error(
            `No events detected in console-display, check your connection / add a sleep before the assertion, or set the env var WEBRTC_CONNECTION_TIMEOUT=1000.`
          );
        }
        expect(remoteLogs[1].payload).toEqual({
          event: "remote.disconnect",
          payload: {
            id: getCurrentRemote().peerId,
          },
        });
        expect(remoteLogs[0].payload).toEqual({
          event: "remote.reconnect",
          payload: {
            id: getCurrentRemote().peerId,
          },
        });
      }
    }
  );
}

/**
 * Will setup all the backgroud steps
 */
export function setupBackground(given, mode) {
  const infos = getVisitInfosFromMode(mode);
  const remotes = [];
  const getAllRemotes = () => remotes;
  const addRemote = (remote) => {
    remotes.push(remote);
  };
  const setRemote = (remote, index) => {
    if (typeof index === "undefined") {
      throw new Error(`setRemote must be passed both remote and index`);
    }
    remotes[index] = remote;
  };
  const getRemote = (index) => remotes.at(index);
  const { getMasterPage } = givenIVisitDemoHomePage(given);
  givenIVisitMasterPage(given, infos.url, infos.title, { getMasterPage });
  const getMasterPeerId = givenMasterPeerOpenEventIsTriggered(given, {
    getMasterPage,
  });

  // open 3 remotes
  for (let i = 0; i < 3; i++) {
    addRemote(givenIOpenANewRemote(given, { getMasterPage }));
    givenMasterAndRemoteEmitReceiveRemoteConnectEvent(given, {
      getCurrentRemote: getRemote(-1),
      getMasterPage,
    });
    givenRemoteListShouldContain(given, { getAllRemotes, getMasterPage });
  }

  return {
    getAllRemotes,
    getRemote,
    addRemote,
    setRemote,
    getMasterPeerId,
    getMasterPage,
  };
}
