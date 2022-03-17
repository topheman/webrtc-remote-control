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
import { ref, computed, onMounted, watchEffect, watch } from "vue";
import { usePeer } from "@webrtc-remote-control/vue";

import "../../shared/js/components/errors-display";
import "../../shared/js/components/qrcode-display";
import "../../shared/js/components/counter-display";
import "../../shared/js/components/remotes-list";
import "../../shared/js/components/console-display";

import OpenRemote from "./OpenRemote.vue";

import {
  persistCountersToStorage,
  getCountersFromStorage,
} from "../../shared/js/counter.master.persistance";
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

    const { ready, api, peer } = usePeer();

    const onRemoteConnect = ({ id }) => {
      const countersFromStorage = getCountersFromStorage();
      logger.log({ event: "remote.connect", payload: { id } });
      remotesList.value.push({
        counter: countersFromStorage?.[id] ?? 0,
        peerId: id,
      });
    };
    const onRemoteDisconnect = ({ id }) => {
      logger.log({ event: "remote.disconnect", payload: { id } });
      remotesList.value = remotesList.value.filter(
        ({ peerId }) => peerId !== id
      );
    };
    const onData = ({ id }, data) => {
      logger.log({ event: "data", data, id });
      const newRemotesListeValue = counterReducer(remotesList.value, {
        data,
        id,
      });
      persistCountersToStorage(newRemotesListeValue);
      remotesList.value = newRemotesListeValue;
    };
    const onPeerError = (error) => {
      peerId.value = null;
      logger.error({ event: "error", error });
      errors.value = [humanizeError(error)];
    };

    watch([ready], ([currentReady], [prevReady], onCleanup) => {
      console.log(
        "Master.watchEffect",
        "resultUsePeer",
        "ready",
        { currentReady, prevReady },
        ready.value,
        api.value.on
      );
      if (ready) {
        peerId.value = peer.value.id;
        logger.log({
          event: "open",
          comment: "Master connected",
          payload: { id: peer.value.id },
        });
        api.value.on("remote.connect", onRemoteConnect);
        api.value.on("remote.disconnect", onRemoteDisconnect);
        api.value.on("data", onData);
        peer.value.on("error", onPeerError);
      }
      onCleanup(() => {
        console.log("Master.vue.cleanup");
        if (ready.value) {
          api.value.off("remote.connect", onRemoteConnect);
          api.value.off("remote.disconnect", onRemoteDisconnect);
          api.value.off("data", onData);
          peer.value.off("error", onPeerError);
        }
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
