import { defineFeature, loadFeature } from "jest-cucumber";

import { setupBackground, givenICloseEveryRemoteTabs } from "../shared";

const feature = loadFeature(`${__dirname}/../features/connection.feature`);

describe.each([
  "vanilla",
  // "react"
])("[%s]", (mode) => {
  defineFeature(feature, (test) => {
    test("Basic", ({ given }) => {
      const { getRemotes } = setupBackground(given, mode);
      givenICloseEveryRemoteTabs(given, { getRemotes });
    });
    test("Send events", async ({ given }) => {
      const { getRemotes } = setupBackground(given, mode);
      givenICloseEveryRemoteTabs(given, { getRemotes });
    });
  });
});
