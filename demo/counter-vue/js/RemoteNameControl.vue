<template>
  <form
    class="form-set-name"
    action="."
    @submit="
      (e) => {
        e.preventDefault();
        onConfirmName?.();
      }
    "
    :disabled="disabled"
  >
    <label>
      <input
        type="text"
        placeholder="Enter name"
        @change="(e) => onChangeName?.((e.target as HTMLInputElement).value)"
        :value="name"
        :disabled="disabled"
      />
      <button type="submit" :disabled="disabled">OK</button>
    </label>
  </form>
</template>

<script setup lang="ts">
defineProps<{
  onChangeName?: (value: string) => void;
  onConfirmName?: () => void;
  name?: string;
  disabled?: boolean;
}>();
</script>
