import { defineFeature, loadFeature } from "jest-cucumber";

import {
  setupBackground,
  givenICloseEveryPages,
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
      givenIResetSessionStorage(given, api);
      givenICloseEveryPages(given, api);
    });
  });
});
