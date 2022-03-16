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
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";

import "../../shared/js/components/errors-display";
import "../../shared/js/components/console-display";

import RemoteCountControl from "./RemoteCountControl.vue";
import RemoteNameControl from "./RemoteNameControl.vue";

export default {
  components: { RemoteCountControl, RemoteNameControl },
  setup() {
    const peerId = ref(null);
    const name = ref(""); // todo handle localStorage
    const logs = ref([]);
    const errors = ref(null);
    const reversedLogs = computed(() => [...logs.value].reverse());

    onMounted(() => {
      errors.value = ["Some fake error"];
      peerId.value = "foobar";
      logs.value = [
        {
          payload: {
            event: "open",
            comment: "Master connected",
            payload: {
              id: "612b2138-b472-4730-b18e-24bc52413e57",
            },
          },
          key: 1,
          level: "log",
        },
        {
          payload: {
            event: "remote.connect",
            payload: {
              id: "5711f631-985a-4b54-91a2-d6f873bda00e",
            },
          },
          key: 2,
          level: "log",
        },
        {
          payload: {
            event: "remote.connect",
            payload: {
              id: "5d435104-7519-44c7-aa05-c6f201e1ae60",
            },
          },
          key: 3,
          level: "log",
        },
        {
          payload: {
            event: "remote.connect",
            payload: {
              id: "f35884c0-12cd-40b9-805f-4e4ce3292421",
            },
          },
          key: 4,
          level: "log",
        },
      ];
    });

    return {
      peerId,
      errors,
      logs,
      reversedLogs,
      name,
      onIncrement: () => {
        console.log("increment");
      },
      onDecrement: () => {
        console.log("decrement");
      },
      onChangeName(value) {
        name.value = value;
      },
      onConfirmName() {
        console.log("confirmName", name.value);
      },
    };
  },
};
</script>
