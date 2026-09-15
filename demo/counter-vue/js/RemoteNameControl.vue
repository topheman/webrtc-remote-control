<template>
  <form
    class="form-set-name"
    action="."
    @submit="
      (e) => {
        e.preventDefault();
        // `e.target` is the form, and the input carries no `name` attribute, so
        // `e.target.name` has always been undefined and this argument has always
        // been `undefined`. `onConfirmName` ignores its argument and reads the
        // name off the store, so nothing is lost - preserved as it behaved, the
        // fix belongs in its own pull request.
        onConfirmName?.(undefined);
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
  onConfirmName?: (value?: string) => void;
  name?: string;
  disabled?: boolean;
}>();
</script>
