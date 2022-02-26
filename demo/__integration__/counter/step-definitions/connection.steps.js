import { defineFeature, loadFeature } from "jest-cucumber";

import {
  givenIVisitDemoHomePage,
  givenIVisitMasterPage,
  givenMasterPeerOpenEventIsTriggered,
  givenIOpenANewRemote,
  givenMasterAndRemoteEmitReceiveRemoteConnectEvent,
} from "../shared";

const feature = loadFeature(`${__dirname}/../features/connection.feature`);

function getVisitInfosFromMode(mode) {
  const infos = {
    vanilla: {
      url: "/counter-vanilla/master.html",
      title: "webrtc-remote-control / demo / vanilla / counter",
    },
    react: {
      url: "/counter-react/index.html",
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
      const getRemotes = [];
      givenIVisitDemoHomePage(given);
      givenIVisitMasterPage(given, infos.url, infos.title);
      // eslint-disable-next-line no-unused-vars
      const getMasterPeerId = givenMasterPeerOpenEventIsTriggered(given);
      getRemotes.push(givenIOpenANewRemote(given));
      givenMasterAndRemoteEmitReceiveRemoteConnectEvent(given, {
        getRemote: getRemotes[0],
      });
      getRemotes.push(givenIOpenANewRemote(given));
      givenMasterAndRemoteEmitReceiveRemoteConnectEvent(given, {
        getRemote: getRemotes[1],
      });
      getRemotes.push(givenIOpenANewRemote(given));
      givenMasterAndRemoteEmitReceiveRemoteConnectEvent(given, {
        getRemote: getRemotes[2],
      });
    });
  });
});
