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
import { usePeer } from "@webrtc-remote-control/vue";
import type { WrcRemoteEvents } from "@webrtc-remote-control/core/remote";

import "../../shared/js/components/errors-display";
import { reconnectNotice } from "../../shared/js/reconnect-notice";
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

// see the note in `Master.vue` about `ready` and the assertions below
const { ready, api, peer, peerReady, humanizeError } = usePeer<"remote">();

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
  if (name.value) {
    api!.value!.send({ type: "REMOTE_SET_NAME", name: name.value });
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
  errors.value = [humanizeError.value(error)];
};
const onData: WrcRemoteEvents["data"] = (_, data) => {
  logger.log({ event: "data", data });
  if ((data as { type?: string }).type === "PING") {
    window?.frameworkIconPlay();
  }
};

watch([peerReady], (_, __, onCleanup) => {
  // always true - see the note on the same guard in `Master.vue`
  if (peer) {
    peer.value!.on("error", onPeerError);
  }
  onCleanup(() => {
    if (peer) {
      peer.value!.off("error", onPeerError);
    }
  });
});

watch([ready], ([currentReady], [prevReady], onCleanup) => {
  console.log(
    "Remote.watchEffect",
    { currentReady, prevReady },
    ready.value,
    api!.value!.on,
  );
  if (ready.value) {
    peerId.value = peer.value!.id;
    logger.log({
      event: "open",
      comment: "Remote connected",
      payload: { id: peer.value!.id },
    });
    api!.value!.on("remote.disconnect", onRemoteDisconnect);
    api!.value!.on("remote.reconnecting", onRemoteReconnecting);
    api!.value!.on("remote.reconnect", onRemoteReconnect);
    api!.value!.on("data", onData);
    if (name.value) {
      api!.value!.send({ type: "REMOTE_SET_NAME", name: name.value });
    }
  }
  onCleanup(() => {
    console.log("Remote.jsx.cleanup");
    if (ready.value) {
      api!.value!.off("remote.disconnect", onRemoteDisconnect);
      api!.value!.off("remote.reconnecting", onRemoteReconnecting);
      api!.value!.off("remote.reconnect", onRemoteReconnect);
      api!.value!.off("data", onData);
    }
  });
});

const onIncrement = () => {
  if (ready.value) {
    api!.value!.send({ type: "COUNTER_INCREMENT" });
  }
};
const onDecrement = () => {
  if (ready.value) {
    api!.value!.send({ type: "COUNTER_DECREMENT" });
  }
};
const onChangeName = (value: string) => {
  name.value = value;
};
const onConfirmName = () => {
  // `ready` is the ref object, so this guard is always true - preserved as
  // written; the send below is what the remote has always done on submit.
  if (ready) {
    api!.value!.send({ type: "REMOTE_SET_NAME", name: name.value });
  }
};
</script>
