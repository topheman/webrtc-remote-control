import { defineFeature, loadFeature } from "jest-cucumber";

import { setupBackground } from "../shared";

const feature = loadFeature(`${__dirname}/../features/connection.feature`);

describe.each([
  "vanilla",
  // "react"
])("[%s]", (mode) => {
  defineFeature(feature, (test) => {
    test("Basic", ({ given }) => {
      setupBackground(given, mode);
    });
  });
});
