// eslint-disable-next-line import/no-extraneous-dependencies
import { inject, watchEffect, toRefs, unref, reactive } from "vue";

import { MyContext } from "./Provider";

export function usePeer() {
  // const ready = ref(false);
  const context = inject(MyContext);
  // const resolvedWrcApi = shallowRef(null);
  console.log("context", context);
  const result = reactive({
    ...unref(context),
    ready: false,
    api: null,
  });
  watchEffect(() => {
    // run on next tick (ensure the `then` of the Provider has executed + retrieve the api from the resolve promise)
    Promise.resolve().then(() => {
      console.log("hooks.Promise.resolve", context);
      context.value?.promise?.then((wrcApi) => {
        console.log("hooks.Promise.resolve - context.promise.then", wrcApi);
        // resolvedWrcApi.value = wrcApi;
        // ready.value = true;
        result.ready = true;
        result.api = wrcApi;
      });
    });
  });
  // use toRefs ? https://vuejs.org/api/reactivity-utilities.html#torefs
  return { ...toRefs(result) };
}
