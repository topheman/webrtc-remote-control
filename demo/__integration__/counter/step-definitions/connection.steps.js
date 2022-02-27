import { defineFeature, loadFeature } from "jest-cucumber";

import {
  setupBackground,
  givenICloseEveryRemoteTabs,
  givenIResetSessionStorage,
  giventIClickTimesOnRemote,
  givenRemoteListShouldContain,
} from "../shared";

const feature = loadFeature(`${__dirname}/../features/connection.feature`);

describe.each([
  "vanilla",
  // "react"
])("[%s]", (mode) => {
  defineFeature(feature, (test) => {
    test("Basic", ({ given }) => {
      const { getAllRemotes } = setupBackground(given, mode);
      givenIResetSessionStorage(given, { getAllRemotes });
      givenICloseEveryRemoteTabs(given, { getAllRemotes });
    });
    test("Send events", async ({ given }) => {
      const { getAllRemotes, getRemote } = setupBackground(given, mode);
      giventIClickTimesOnRemote(given, { getRemote });
      giventIClickTimesOnRemote(given, { getRemote });
      giventIClickTimesOnRemote(given, { getRemote });
      givenRemoteListShouldContain(given, { getAllRemotes });
      givenIResetSessionStorage(given, { getAllRemotes });
      givenICloseEveryRemoteTabs(given, { getAllRemotes });
    });
    test("Reconnection", async ({ given }) => {
      const { getAllRemotes } = setupBackground(given, mode);
      givenIResetSessionStorage(given, { getAllRemotes });
      givenICloseEveryRemoteTabs(given, { getAllRemotes });
    });
  });
});
