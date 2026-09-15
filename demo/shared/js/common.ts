export type LogLevel = "log" | "info" | "warn" | "error";

export interface LogEntry {
  payload: unknown;
  key: number;
  level: LogLevel;
}

export interface MakeLoggerOptions {
  onLog?: (logs: LogEntry[]) => void;
  logs?: LogEntry[];
  size?: number;
}

export type Logger = Record<LogLevel, (payload: unknown) => LogEntry[]>;

export const LOG_LEVELS = ["log", "info", "warn", "error"] as const;

// todo part of it should be in core (expose humanized error ?)
export function humanizeErrors(errors: string[] = []): string[] {
  const transform: [RegExp, string][] = [
    [
      /ID ".*" is taken/,
      "You may have this main page opened on an other tab, please close it",
    ],
  ];
  return errors.reduce<string[]>((errorsList, currentError) => {
    const humanizedCurrentError = transform.reduce(
      (acc, [regExp, replaceError]) => {
        acc = currentError.replace(regExp, replaceError);
        return acc;
      },
      currentError,
    );
    errorsList.push(humanizedCurrentError);
    return errorsList;
  }, []);
}

export function makeLogger({
  onLog = () => {},
  logs = [],
  size = 30,
}: MakeLoggerOptions = {}): Logger {
  function makeLogFunction(type: LogLevel) {
    return function log(payload: unknown): LogEntry[] {
      logs = logs.concat({
        payload,
        key: (logs.slice(-1)[0] ?? { key: 0 }).key + 1,
        level: type,
      });
      while (logs.length > size) {
        logs.shift();
      }
      console[type](payload);
      onLog(logs);
      return logs;
    };
  }
  // Spelled out rather than built from `LOG_LEVELS` with
  // `Object.fromEntries`, which widens the keys back to `string`. The
  // insertion order is the one the tests assert on.
  return {
    log: makeLogFunction("log"),
    info: makeLogFunction("info"),
    warn: makeLogFunction("warn"),
    error: makeLogFunction("error"),
  };
}
