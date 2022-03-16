<template>
  <div>
    <errors-display :data="errors"></errors-display>
    <qrcode-display
      width="160"
      height="160"
      :data="`makeRemotePeerUrl(peerId)`"
      v-if="peerId"
    ></qrcode-display>
    <OpenRemote :peerId="peerId" />
    <p>
      Global counter:
      <counter-display
        class="global-counter"
        :data="globalCount(remotesList)"
      />
    </p>
    <remotes-list :data="remotesList"></remotes-list>
    <console-display :data="reversedLogs" />
  </div>
</template>

<script>
import { ref, computed, onMounted, watchEffect } from "vue";
import { usePeer } from "@webrtc-remote-control/vue";

import "../../shared/js/components/errors-display";
import "../../shared/js/components/qrcode-display";
import "../../shared/js/components/counter-display";
import "../../shared/js/components/remotes-list";
import "../../shared/js/components/console-display";

import OpenRemote from "./OpenRemote.vue";

import {
  // counterReducer,
  globalCount,
} from "../../shared/js/counter.master.logic";
import { useLogger } from "./common";

function makeRemotePeerUrl(peerId) {
  return `${
    window.location.origin +
    window.location.pathname
      .replace(/\/$/, "")
      .split("/")
      .slice(0, -1)
      .join("/")
  }/index.html#${peerId}`;
}

export default {
  components: { OpenRemote },
  setup() {
    const { logs, logger } = useLogger([]);
    const peerId = ref(null);
    const remotesList = ref([]);
    const errors = ref(null);
    const reversedLogs = computed(() => [...logs.value].reverse());

    const resultUsePeer = usePeer();
    console.log("Master.setup", "resultUsePeer", resultUsePeer);

    watchEffect(() => {
      console.log("Master.watchEffect", "resultUsePeer", resultUsePeer);
    });

    onMounted(() => {
      console.log("Master.onMounted", "resultUsePeer", resultUsePeer);
      errors.value = ["Some fake error"];
      peerId.value = "foobar";
      remotesList.value = [
        { counter: -3, peerId: "5711f631-985a-4b54-91a2-d6f873bda00e" },
        { counter: 2, peerId: "f35884c0-12cd-40b9-805f-4e4ce3292421" },
        { counter: 6, peerId: "5d435104-7519-44c7-aa05-c6f201e1ae60" },
      ];
      logger.log({
        event: "open",
        comment: "Master connected",
        payload: {
          id: "612b2138-b472-4730-b18e-24bc52413e57",
        },
      });
      logger.log({
        event: "remote.connect",
        payload: {
          id: "5711f631-985a-4b54-91a2-d6f873bda00e",
        },
      });
      logger.log({
        event: "remote.connect",
        payload: {
          id: "5d435104-7519-44c7-aa05-c6f201e1ae60",
        },
      });
      logger.log({
        event: "remote.connect",
        payload: {
          id: "f35884c0-12cd-40b9-805f-4e4ce3292421",
        },
      });
    });

    return {
      peerId,
      remotesList,
      errors,
      makeRemotePeerUrl,
      logs,
      reversedLogs,
      globalCount,
    };
  },
};
</script>
