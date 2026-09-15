<template>
  <p>
    Direct link to source code:
    <a
      :href="`https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-vue/js/${target}.vue`"
    >
      {{ target }}.vue
    </a>
    /
    <a
      href="https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-vue/js/App.vue"
    >
      App.vue
    </a>
  </p>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  mode: "master" | "remote";
}>();

const target = computed(
  () => props.mode.at(0)!.toUpperCase() + props.mode.slice(1),
);
</script>
