<template>
  <div>
    <errors-display :data="errors"></errors-display>
    <qrcode-display
      width="160"
      height="160"
      :data="makeRemotePeerUrl(peerId)"
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
    <DirectLinkToSource mode="master" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useMaster } from "@webrtc-remote-control/vue";
import type { WrcMasterEvents } from "@webrtc-remote-control/core/master";

import "../../shared/js/components/errors-display";
import "../../shared/js/components/qrcode-display";
import "../../shared/js/components/counter-display";
import "../../shared/js/components/remotes-list";
import "../../shared/js/components/console-display";

import OpenRemote from "./OpenRemote.vue";
import DirectLinkToSource from "./DirectLinkToSource.vue";

import {
  persistCountersToStorage,
  getCountersFromStorage,
} from "../../shared/js/counter.master.persistance";
import {
  counterReducer,
  globalCount,
} from "../../shared/js/counter.master.logic";
import type {
  CounterAction,
  RemoteCounter,
} from "../../shared/js/counter.master.logic";
import { useLogger } from "./common";

function makeRemotePeerUrl(peerId: string) {
  return `${
    window.location.origin +
    window.location.pathname
      .replace(/\/$/, "")
      .split("/")
      .slice(0, -1)
      .join("/")
  }/index.html#${peerId}`;
}

const { logs, logger } = useLogger();
const peerId = ref<string | null>(null);
const remotesList = ref<RemoteCounter[]>([]);
const errors = ref<string[] | null>(null);
const reversedLogs = computed(() => [...logs.value].reverse());

// `humanizeError` is a plain function: it is built with the connection and
// never changes, so only the part that does is a ref. `state.value.ready` is
// the discriminant of that ref's union, so reading it narrows `api` and `peer`
// on the same value - nothing below needs an assertion.
const { state, humanizeError } = useMaster();

const onRemoteConnect: WrcMasterEvents["remote.connect"] = ({ id }) => {
  const countersFromStorage = getCountersFromStorage();
  logger.log({ event: "remote.connect", payload: { id } });
  remotesList.value = [
    ...remotesList.value,
    {
      counter: countersFromStorage?.[id] ?? 0,
      peerId: id,
    },
  ];
};
const onRemoteDisconnect: WrcMasterEvents["remote.disconnect"] = ({ id }) => {
  logger.log({ event: "remote.disconnect", payload: { id } });
  // eslint-disable-next-line no-shadow
  remotesList.value = remotesList.value.filter(({ peerId }) => peerId !== id);
};
const onData: WrcMasterEvents["data"] = ({ id }, data) => {
  logger.log({ event: "data", data, id });
  const newRemotesListValue = counterReducer(remotesList.value, {
    data: data as CounterAction,
    id,
  });
  persistCountersToStorage(newRemotesListValue);
  remotesList.value = newRemotesListValue;
};
const onPeerError = (error: Error) => {
  peerId.value = null;
  logger.error({ event: "error", error });
  errors.value = [humanizeError(error)];
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
  // One branch for the whole body: `current` is the union, so this is where
  // both `api` and `peer` become known to be there.
  if (!current.ready) {
    return;
  }
  const { api, peer } = current;
  peerId.value = peer.id;
  logger.log({
    event: "open",
    comment: "Master connected",
    payload: { id: peer.id },
  });
  api.on("remote.connect", onRemoteConnect);
  api.on("remote.disconnect", onRemoteDisconnect);
  api.on("data", onData);
  onCleanup(() => {
    console.log("Master.vue.cleanup");
    api.off("remote.connect", onRemoteConnect);
    api.off("remote.disconnect", onRemoteDisconnect);
    api.off("data", onData);
  });
});

// manage `ping` / `ping all` buttons

const onPingAll = () => {
  const current = state.value;
  if (current.ready) {
    current.api.sendAll({
      type: "PING",
      date: new Date(),
    });
  }
};
const onPing = ({ detail: { id } }: HTMLElementEventMap["ping"]) => {
  const current = state.value;
  if (current.ready) {
    current.api.sendTo(id!, {
      type: "PING",
      date: new Date(),
    });
  }
};

onMounted(() => {
  document
    .querySelector("remotes-list")!
    .addEventListener("pingAll", onPingAll);
  document.querySelector("remotes-list")!.addEventListener("ping", onPing);
});

// cleanup
onUnmounted(() => {
  document
    .querySelector("remotes-list")!
    .removeEventListener("pingAll", onPingAll);
  document.querySelector("remotes-list")!.removeEventListener("ping", onPing);
});
</script>
