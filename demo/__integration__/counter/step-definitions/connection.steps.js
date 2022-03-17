import { defineFeature, loadFeature } from "jest-cucumber";

import {
  setupBackground,
  givenICloseEveryPages,
  givenIResetSessionStorage,
  giventIClickTimesOnRemote,
  givenRemoteListShouldContain,
  givenIReloadARemoteThenMasterShouldReceiveDisconnectEvent,
  givenIReloadMasterThenRemotesShouldReconnect,
} from "../shared";

const feature = loadFeature(`${__dirname}/../features/connection.feature`);

jest.setTimeout(Number(process.env.JEST_TIMEOUT) || 10000);

describe.each(["vanilla", "react", "vue"])("[%s]", (mode) => {
  defineFeature(feature, (test) => {
    jest.retryTimes(3);
    test("Basic", ({ given }) => {
      const api = setupBackground(given, mode);
      givenIResetSessionStorage(given, api);
      givenICloseEveryPages(given, api);
    });
    test("Send events", async ({ given }) => {
      const api = setupBackground(given, mode);
      giventIClickTimesOnRemote(given, api);
      giventIClickTimesOnRemote(given, api);
      giventIClickTimesOnRemote(given, api);
      givenRemoteListShouldContain(given, api);
      givenIResetSessionStorage(given, api);
      givenICloseEveryPages(given, api);
    });
    test("Reconnection", async ({ given }) => {
      const api = setupBackground(given, mode);
      givenIReloadARemoteThenMasterShouldReceiveDisconnectEvent(given, api);
      givenIReloadMasterThenRemotesShouldReconnect(given, api);
      givenIResetSessionStorage(given, api);
      givenICloseEveryPages(given, api);
    });
  });
});
