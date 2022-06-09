<template>
  <div>
    <Master v-if="mode === 'master'" key="master" />
    <Remote v-if="mode === 'remote'" key="remote" />
    <footer-display from="2022" :to="new Date().getFullYear()" />
  </div>
</template>

<script>
import { onBeforeMount, ref } from "vue";

import { provideWebTCRemoteControl } from "@webrtc-remote-control/vue";

import { getPeerjsConfig } from "../../shared/js/common-peerjs";

import "../../shared/js/components/footer-display";

import Master from "./Master.vue";
import Remote from "./Remote.vue";

export default {
  components: { Master, Remote },
  setup() {
    const mode = ref(null);
    onBeforeMount(() => {
      mode.value = window.location.hash ? "remote" : "master";
      provideWebTCRemoteControl(
        ({ getPeerId }) =>
          new Peer(
            getPeerId(),
            // line bellow is optional - you can rely on the signaling server exposed by peerjs
            getPeerjsConfig()
          ),
        mode.value,
        {
          masterPeerId:
            (window.location.hash && window.location.hash.replace("#", "")) ||
            null,
          sessionStorageKey: "webrtc-remote-control-peer-id-vue",
        }
      );
    });
    return {
      mode,
    };
  },
};
</script>
