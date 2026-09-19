<template>
  <div>
    <Master v-if="mode === 'master'" key="master" />
    <Remote v-if="mode === 'remote'" key="remote" />
    <footer-display from="2022" :to="new Date().getFullYear()" />
  </div>
</template>

<script setup lang="ts">
import { provideMaster, provideRemote } from "@webrtc-remote-control/vue";
import type { GetPeerIdType } from "@webrtc-remote-control/core";

import { getPeerjsConfig } from "../../shared/js/common-peerjs";

import "../../shared/js/components/footer-display";

import Master from "./Master.vue";
import Remote from "./Remote.vue";

const SESSION_STORAGE_KEY = "webrtc-remote-control-peer-id-vue";

/**
 * The same callback on both sides: each composable hands `init` its own
 * utilities, and this only reads the one they share.
 */
const init = ({ getPeerId }: { getPeerId: GetPeerIdType }) =>
  new Peer(
    // `getPeerId` returns the id kept in session storage, or undefined the
    // first time round - peerjs takes that as "allocate me one".
    getPeerId(),
    // line bellow is optional - you can rely on the signaling server exposed by peerjs
    getPeerjsConfig(),
  );

// Which side this is, is decided here and nowhere else: picking the composable
// picks the mode, so nothing downstream has to be told which one it is.
const mode = window.location.hash ? "remote" : "master";

// `provide` has to run while `setup` is on the stack, which is why this is not
// in an `onBeforeMount` - and there is nothing to wait for either, the hash is
// readable straight away.
if (mode === "remote") {
  provideRemote(init, {
    masterPeerId: window.location.hash.replace("#", ""),
    sessionStorageKey: SESSION_STORAGE_KEY,
  });
} else {
  provideMaster(init, { sessionStorageKey: SESSION_STORAGE_KEY });
}
</script>
