import { defineFeature, loadFeature } from "jest-cucumber";

import {
  givenIVisitDemoHomePage,
  givenIVisitMasterPage,
  givenMasterPeerOpenEventIsTriggered,
  givenIOpenANewRemote,
  givenMasterAndRemoteEmitReceiveRemoteConnectEvent,
  givenRemoteListShouldContain,
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
      const remotes = [];
      const getRemotes = () => remotes;
      givenIVisitDemoHomePage(given);
      givenIVisitMasterPage(given, infos.url, infos.title);
      // eslint-disable-next-line no-unused-vars
      const getMasterPeerId = givenMasterPeerOpenEventIsTriggered(given);
      remotes.push(givenIOpenANewRemote(given));
      givenMasterAndRemoteEmitReceiveRemoteConnectEvent(given, {
        getRemote: remotes[0],
      });
      givenRemoteListShouldContain(given, { getRemotes });
      remotes.push(givenIOpenANewRemote(given));
      givenMasterAndRemoteEmitReceiveRemoteConnectEvent(given, {
        getRemote: remotes[1],
      });
      givenRemoteListShouldContain(given, { getRemotes });
      remotes.push(givenIOpenANewRemote(given));
      givenMasterAndRemoteEmitReceiveRemoteConnectEvent(given, {
        getRemote: remotes[2],
      });
      givenRemoteListShouldContain(given, { getRemotes });
    });
  });
});
