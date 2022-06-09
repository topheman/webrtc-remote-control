import { defineFeature, loadFeature } from "jest-cucumber";
// eslint-disable-next-line import/no-extraneous-dependencies
import chalk from "chalk";

import { makeGetModes } from "../../helpers";

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

/**
 * You can pass:
 * - `MODE=react npm run test:e2e`
 * - `MODE=vanilla,react npm run test:e2e`
 * By default, it runs all
 */
const getModes = makeGetModes("MODE", ["vanilla", "react", "vue"]);

console.log(`Running tests for ${chalk.yellow(getModes().join(", "))}`);

describe.each(getModes())("[%s]", (mode) => {
  defineFeature(feature, (test) => {
    jest.retryTimes(3);
    test("Basic", ({ given }) => {
      const api = setupBackground(given, mode);
      givenIResetSessionStorage(given, mode, api);
      givenICloseEveryPages(given, api);
    });
    test("Send events", async ({ given }) => {
      const api = setupBackground(given, mode);
      giventIClickTimesOnRemote(given, api);
      giventIClickTimesOnRemote(given, api);
      giventIClickTimesOnRemote(given, api);
      givenRemoteListShouldContain(given, api);
      givenIResetSessionStorage(given, mode, api);
      givenICloseEveryPages(given, api);
    });
    test("Reconnection", async ({ given }) => {
      const api = setupBackground(given, mode);
      givenIReloadARemoteThenMasterShouldReceiveDisconnectEvent(given, api);
      givenIReloadMasterThenRemotesShouldReconnect(given, api);
      givenIResetSessionStorage(given, mode, api);
      givenICloseEveryPages(given, api);
    });
  });
});
