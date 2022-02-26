import { defineFeature, loadFeature } from "jest-cucumber";

import {
  givenIVisitDemoHomePage,
  givenIVisitMasterPage,
  givenMasterPeerOpenEventIsTriggered,
} from "../shared";

const feature = loadFeature(`${__dirname}/../features/connection.feature`);

defineFeature(feature, (test) => {
  test("Connecting multiple remotes", ({ given }) => {
    givenIVisitDemoHomePage(given);
    givenIVisitMasterPage(
      given,
      "/counter/master.html",
      "webrtc-remote-control / demo / counter"
    );
    givenMasterPeerOpenEventIsTriggered(given);
  });
});
