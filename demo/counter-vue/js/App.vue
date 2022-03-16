<template>
  <div>
    <master v-if="mode === 'master'" />
    <remote v-if="mode === 'remote'" />
    <footer-display from="2022" :to="new Date().getFullYear()" />
  </div>
</template>

<script>
import { onBeforeMount, ref } from "vue";

import "../../shared/js/components/footer-display";

import Master from "./Master.vue";
import Remote from "./Remote.vue";

export default {
  components: { Master, Remote },
  setup() {
    const mode = ref(null);
    onBeforeMount(() => {
      mode.value = window.location.hash ? "remote" : "master";
    });
    return {
      mode,
    };
  },
};
</script>
