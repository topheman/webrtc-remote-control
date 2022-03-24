<template>
  <div>
    <master v-if="mode === 'master'" key="master" />
    <remote v-if="mode === 'remote'" key="remote" />
    <footer-display from="2022" :to="new Date().getFullYear()" />
  </div>
</template>

<script>
import { onBeforeMount, ref } from "vue";

import { provideWebTCRemoteControl } from "@webrtc-remote-control/vue";

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
            import.meta.env.VITE_USE_LOCAL_PEER_SERVER
              ? {
                  host: "localhost",
                  port: 9000,
                  path: "/myapp",
                }
              : undefined
          ),
        mode.value,
        {
          masterPeerId:
            (window.location.hash && window.location.hash.replace("#", "")) ||
            null,
        }
      );
    });
    return {
      mode,
    };
  },
};
</script>
