// eslint-disable-next-line import/no-extraneous-dependencies
import { ref, inject, shallowRef, watchEffect } from "vue";

import { MyContext } from "./Provider";

export function usePeer() {
  const ready = ref(false);
  const context = inject(MyContext);
  const resolvedWrcApi = shallowRef(null);
  watchEffect(() => {
    // run on next tick (ensure the `then` of the Provider has executed + retrieve the api from the resolve promise)
    Promise.resolve().then(() => {
      context?.promise?.then((wrcApi) => {
        resolvedWrcApi.value = wrcApi;
        ready.value = true;
      });
    });
  });
  return {
    ready: ready.value,
    api: resolvedWrcApi.value,
  };
}
