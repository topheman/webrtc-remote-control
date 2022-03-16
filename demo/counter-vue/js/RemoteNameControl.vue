<template>
  <form
    class="form-set-name"
    action="."
    @submit="
      (e) => {
        e.preventDefault();
        onConfirmName(e.target.name.value);
      }
    "
    :disabled="disabled"
  >
    <label>
      <input
        type="text"
        placeholder="Enter name"
        @change="(e) => onChangeName(e.target.value)"
        :value="name"
        :disabled="disabled"
      />
      <button type="submit" :disabled="disabled">OK</button>
    </label>
  </form>
</template>

<script>
export default {
  props: {
    onChangeName: Function,
    onConfirmName: Function,
    name: String,
    disabled: Boolean,
  },
};
</script>
