import { ref, shallowRef } from "vue";
import type { Ref } from "vue";

import { makeLogger } from "../../shared/js/common";
import type { LogEntry, Logger } from "../../shared/js/common";

export function useLogger(): { logger: Logger; logs: Ref<LogEntry[]> } {
  const loggerRef = shallowRef(makeLogger());
  const logs = ref<LogEntry[]>([]);
  // Before the port this was built with `Object.fromEntries` over the level
  // names, which types the result as a plain index signature. Spelling the four
  // levels out is what makes it a `Logger`; the wrappers are identical.
  const makeLevel = (level: keyof Logger) => (msg: unknown) => {
    const fullLogs = loggerRef.value[level](msg);
    logs.value = fullLogs;
    return fullLogs;
  };
  const logger: Logger = {
    log: makeLevel("log"),
    info: makeLevel("info"),
    warn: makeLevel("warn"),
    error: makeLevel("error"),
  };
  return {
    logger,
    logs,
  };
}
