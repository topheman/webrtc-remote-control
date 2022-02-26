import { defineFeature, loadFeature } from "jest-cucumber";

import {
  givenIVisitDemoHomePage,
  givenIVisitMasterPage,
  givenMasterPeerOpenEventIsTriggered,
} from "../shared";

const feature = loadFeature(`${__dirname}/../features/connection.feature`);

function getVisitInfosFromMode(mode) {
  const infos = {
    vanilla: {
      url: "/counter/master.html",
      title: "webrtc-remote-control / demo / counter",
    },
    react: {
      url: "/react-counter/index.html",
      title: "webrtc-remote-control / demo / react / counter",
    },
  };
  return infos[mode];
}

describe.each([
  "vanilla",
  // "react"
])("[%s]", (mode) => {
  defineFeature(feature, (test) => {
    test("Connecting multiple remotes", ({ given }) => {
      const infos = getVisitInfosFromMode(mode);
      givenIVisitDemoHomePage(given);
      givenIVisitMasterPage(given, infos.url, infos.title);
      givenMasterPeerOpenEventIsTriggered(given);
    });
  });
});
