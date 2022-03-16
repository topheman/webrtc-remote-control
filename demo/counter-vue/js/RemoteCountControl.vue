<template>
  <div class="counter-control">
    <button
      type="button"
      class="counter-control-add"
      @click="onIncrement"
      style="margin-right: 2px"
      :disabled="disabled"
    >
      +
    </button>
    <button
      type="button"
      class="counter-control-sub"
      @click="onDecrement"
      style="margin-left: 2px"
      :disabled="disabled"
    >
      -
    </button>
  </div>
</template>

<script>
export default {
  props: {
    onIncrement: Function,
    onDecrement: Function,
    disabled: Boolean,
  },
};
</script>
