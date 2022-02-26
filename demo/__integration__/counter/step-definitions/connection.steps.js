import { defineFeature, loadFeature } from "jest-cucumber";

import {
  setupBackground,
  givenICloseEveryRemoteTabs,
  givenIResetSessionStorage,
} from "../shared";

const feature = loadFeature(`${__dirname}/../features/connection.feature`);

describe.each([
  "vanilla",
  // "react"
])("[%s]", (mode) => {
  defineFeature(feature, (test) => {
    test("Basic", ({ given }) => {
      const { getRemotes } = setupBackground(given, mode);
      givenIResetSessionStorage(given, { getRemotes });
      givenICloseEveryRemoteTabs(given, { getRemotes });
    });
    test("Send events", async ({ given }) => {
      const { getRemotes } = setupBackground(given, mode);
      givenIResetSessionStorage(given, { getRemotes });
      givenICloseEveryRemoteTabs(given, { getRemotes });
    });
    test("Reconnection", async ({ given }) => {
      const { getRemotes } = setupBackground(given, mode);
      givenIResetSessionStorage(given, { getRemotes });
      givenICloseEveryRemoteTabs(given, { getRemotes });
    });
  });
});
