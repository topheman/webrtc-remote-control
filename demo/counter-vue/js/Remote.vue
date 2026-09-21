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

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useSessionStorage } from "@vueuse/core";
import { useRemote } from "@webrtc-remote-control/vue";
import type { WrcRemoteEvents } from "@webrtc-remote-control/core/remote";

import "../../shared/js/components/errors-display";
import "../../shared/js/components/console-display";

import RemoteCountControl from "./RemoteCountControl.vue";
import RemoteNameControl from "./RemoteNameControl.vue";
import DirectLinkToSource from "./DirectLinkToSource.vue";

import { useLogger } from "./common";

const { logs, logger } = useLogger();
const peerId = ref<string | null>(null);
const name = useSessionStorage("remote-name", "");
const errors = ref<string[] | null>(null);
const reversedLogs = computed(() => [...logs.value].reverse());

// see the note in `Master.vue` about `state` narrowing `api` and `peer`
const { state, humanizeError, reconnectNotice } = useRemote();

const onRemoteDisconnect: WrcRemoteEvents["remote.disconnect"] = (payload) => {
  logger.log({ event: "remote.disconnect", payload });
};
const reconnecting = ref(false);
const onRemoteReconnecting: WrcRemoteEvents["remote.reconnecting"] = (
  payload,
) => {
  logger.log({ event: "remote.reconnecting", payload });
  reconnecting.value = true;
  errors.value = [reconnectNotice(payload)];
};
const onRemoteReconnect: WrcRemoteEvents["remote.reconnect"] = (payload) => {
  logger.log({ event: "remote.reconnect", payload });
  reconnecting.value = false;
  // `onPeerError` nulled `peerId` and put an error on screen, which disables
  // every control. Reconnecting has to undo both, or a remote that came back
  // is indistinguishable from one that never did.
  peerId.value = payload.id;
  errors.value = null;
  // This callback outlives the branch that registered it, so it reads `state`
  // again rather than closing over an api that was narrowed back then.
  const current = state.value;
  if (current.ready && name.value) {
    current.api.send({ type: "REMOTE_SET_NAME", name: name.value });
  }
};
const onPeerError = (error: Error) => {
  peerId.value = null;
  logger.error({ event: "error", error });
  // While the retry loop is running, a `peer-unavailable` is just the attempt
  // that lost its race to the master re-registering. The reconnection notice
  // already says so, and `humanizeError` would talk over it with advice to
  // reload - the one thing the user does not need to do.
  if (
    reconnecting.value &&
    (error as { type?: string }).type === "peer-unavailable"
  ) {
    return;
  }
  errors.value = [humanizeError(error)];
};
const onData: WrcRemoteEvents["data"] = (_, data) => {
  logger.log({ event: "data", data });
  if ((data as { type?: string }).type === "PING") {
    window?.frameworkIconPlay();
  }
};

watch(
  () => state.value.peer,
  (currentPeer, _, onCleanup) => {
    if (currentPeer) {
      currentPeer.on("error", onPeerError);
      onCleanup(() => {
        currentPeer.off("error", onPeerError);
      });
    }
  },
  { immediate: true },
);

watch(state, (current, _, onCleanup) => {
  if (!current.ready) {
    return;
  }
  const { api, peer } = current;
  peerId.value = peer.id;
  logger.log({
    event: "open",
    comment: "Remote connected",
    payload: { id: peer.id },
  });
  api.on("remote.disconnect", onRemoteDisconnect);
  api.on("remote.reconnecting", onRemoteReconnecting);
  api.on("remote.reconnect", onRemoteReconnect);
  api.on("data", onData);
  if (name.value) {
    api.send({ type: "REMOTE_SET_NAME", name: name.value });
  }
  onCleanup(() => {
    console.log("Remote.vue.cleanup");
    api.off("remote.disconnect", onRemoteDisconnect);
    api.off("remote.reconnecting", onRemoteReconnecting);
    api.off("remote.reconnect", onRemoteReconnect);
    api.off("data", onData);
  });
});

const onIncrement = () => {
  const current = state.value;
  if (current.ready) {
    current.api.send({ type: "COUNTER_INCREMENT" });
  }
};
const onDecrement = () => {
  const current = state.value;
  if (current.ready) {
    current.api.send({ type: "COUNTER_DECREMENT" });
  }
};
const onChangeName = (value: string) => {
  name.value = value;
};
const onConfirmName = () => {
  const current = state.value;
  if (current.ready) {
    current.api.send({ type: "REMOTE_SET_NAME", name: name.value });
  }
};
</script>
