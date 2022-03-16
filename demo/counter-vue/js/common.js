import { ref, shallowRef } from "vue";

import { makeLogger } from "../../shared/js/common";

export function useLogger() {
  const loggerRef = shallowRef(makeLogger());
  const logs = ref([]);
  const logger = Object.fromEntries(
    ["log", "info", "warn", "error"].map((level) => [
      level,
      (msg) => {
        const fullLogs = loggerRef.value[level](msg);
        logs.value = fullLogs;
      },
    ])
  );
  return {
    logger,
    logs,
  };
}
