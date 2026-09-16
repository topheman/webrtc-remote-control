import { useState, useRef } from "react";

import { makeLogger } from "./common";
import type { LogEntry, Logger } from "./common";

export function useLogger(): { logger: Logger; logs: LogEntry[] } {
  const loggerRef = useRef(makeLogger());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const makeLevel = (level: keyof Logger) => (msg: unknown) => {
    const fullLogs = loggerRef.current[level](msg);
    setLogs(fullLogs);
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

// inspired by https://usehooks.com/useLocalStorage/
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((current: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.sessionStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to sessionStorage.
  const setValue = (value: T | ((current: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to session storage
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };
  return [storedValue, setValue];
}
