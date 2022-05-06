<template>
  <div>
    <errors-display :data="errors"></errors-display>
    <RemoteCountControl
      :onIncrement="onIncrement"
      :onDecrement="onDecrement"
      :disabled="!peerId"
    />
    <RemoteNameControl
      :onChangeName="onChangeName"
      :name="name"
      :onConfirmName="onConfirmName"
      :disabled="!peerId"
    />
    <p>
      Check the counter updating in real-time on the original page, thanks to
      WebRTC.
    </p>
    <console-display :data="reversedLogs" />
    <DirectLinkToSource mode="remote" />
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";
import { useSessionStorage } from "@vueuse/core";
import { usePeer } from "@webrtc-remote-control/vue";

import "../../shared/js/components/errors-display";
import "../../shared/js/components/console-display";

import RemoteCountControl from "./RemoteCountControl.vue";
import RemoteNameControl from "./RemoteNameControl.vue";
import DirectLinkToSource from "./DirectLinkToSource.vue";

import { useLogger } from "./common";

export default {
  components: { RemoteCountControl, RemoteNameControl, DirectLinkToSource },
  setup() {
    const { logs, logger } = useLogger([]);
    const peerId = ref(null);
    const name = useSessionStorage("remote-name", "");
    const errors = ref(null);
    const reversedLogs = computed(() => [...logs.value].reverse());

    const { ready, api, peer, peerReady, humanizeError } = usePeer();

    const onRemoteDisconnect = (payload) => {
      logger.log({ event: "remote.disconnect", payload });
    };
    const onRemoteReconnect = (payload) => {
      logger.log({ event: "remote.reconnect", payload });
      if (name.value) {
        api.value.send({ type: "REMOTE_SET_NAME", name: name.value });
      }
    };
    const onPeerError = (error) => {
      peerId.value = null;
      logger.error({ event: "error", error });
      errors.value = [humanizeError.value(error)];
    };
    const onData = (_, data) => {
      logger.log({ event: "data", data });
      if (data.type === "PING") {
        window?.frameworkIconPlay();
      }
    };

    watch([peerReady], (_, __, onCleanup) => {
      if (peer) {
        peer.value.on("error", onPeerError);
      }
      onCleanup(() => {
        if (peer) {
          peer.value.off("error", onPeerError);
        }
      });
    });

    watch([ready], ([currentReady], [prevReady], onCleanup) => {
      console.log(
        "Remote.watchEffect",
        { currentReady, prevReady },
        ready.value,
        api.value.on
      );
      if (ready.value) {
        peerId.value = peer.value.id;
        logger.log({
          event: "open",
          comment: "Remote connected",
          payload: { id: peer.value.id },
        });
        api.value.on("remote.disconnect", onRemoteDisconnect);
        api.value.on("remote.reconnect", onRemoteReconnect);
        api.value.on("data", onData);
        if (name.value) {
          api.value.send({ type: "REMOTE_SET_NAME", name: name.value });
        }
      }
      onCleanup(() => {
        console.log("Remote.jsx.cleanup");
        if (ready.value) {
          api.value.off("remote.disconnect", onRemoteDisconnect);
          api.value.off("remote.reconnect", onRemoteReconnect);
          api.value.off("data", onData);
        }
      });
    });

    return {
      peerId,
      errors,
      logs,
      reversedLogs,
      name,
      onIncrement: () => {
        if (ready.value) {
          api.value.send({ type: "COUNTER_INCREMENT" });
        }
      },
      onDecrement: () => {
        if (ready.value) {
          api.value.send({ type: "COUNTER_DECREMENT" });
        }
      },
      onChangeName(value) {
        name.value = value;
      },
      onConfirmName() {
        if (ready) {
          api.value.send({ type: "REMOTE_SET_NAME", name: name.value });
        }
      },
    };
  },
};
</script>
