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

// inspired by https://usehooks.com/useLocalStorage/
export function useSessionStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.sessionStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to sessionStorage.
  const setValue = (value) => {
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
