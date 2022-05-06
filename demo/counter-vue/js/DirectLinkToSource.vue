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

<script>
export default {
  props: {
    mode: String,
  },
  computed: {
    target() {
      return this.mode.at(0).toUpperCase() + this.mode.slice(1);
    },
  },
};
</script>
