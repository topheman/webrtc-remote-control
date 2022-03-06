import { useState, useRef } from "react";

import { makeLogger } from "../../shared/js/common";

export function useLogger() {
  const loggerRef = useRef(makeLogger());
  const [logs, setLogs] = useState([]);
  const logger = Object.fromEntries(
    ["log", "info", "warn", "error"].map((level) => [
      level,
      (msg) => {
        const fullLogs = loggerRef.current[level](msg);
        setLogs(fullLogs);
      },
    ])
  );
  return {
    logger,
    logs,
  };
}
