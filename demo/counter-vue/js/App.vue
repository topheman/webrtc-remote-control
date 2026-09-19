<template>
  <div>
    <Master v-if="mode === 'master'" key="master" />
    <Remote v-if="mode === 'remote'" key="remote" />
    <footer-display from="2022" :to="new Date().getFullYear()" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, ref } from "vue";

import { provideWebTCRemoteControl } from "@webrtc-remote-control/vue";

import { getPeerjsConfig } from "../../shared/js/common-peerjs";

import "../../shared/js/components/footer-display";

import Master from "./Master.vue";
import Remote from "./Remote.vue";

const mode = ref<"master" | "remote" | null>(null);

onBeforeMount(() => {
  mode.value = window.location.hash ? "remote" : "master";
  provideWebTCRemoteControl(
    ({ getPeerId }) =>
      new Peer(
        // `getPeerId` returns the id kept in session storage, or undefined the
        // first time round - peerjs takes that as "allocate me one".
        getPeerId(),
        // line bellow is optional - you can rely on the signaling server exposed by peerjs
        getPeerjsConfig(),
      ),
    mode.value,
    {
      // the option is optional rather than nullable, so the empty case is
      // `undefined` here where it used to be `null`
      masterPeerId:
        (window.location.hash && window.location.hash.replace("#", "")) ||
        undefined,
      sessionStorageKey: "webrtc-remote-control-peer-id-vue",
    },
  );
});
</script>
