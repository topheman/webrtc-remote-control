export type ConsoleMethodName = "error" | "warn" | "log" | "info";

export function disableConsole(
  mockFunction: (...args: unknown[]) => void = () => {},
  methodNames: ConsoleMethodName[] = ["error", "warn", "log", "info"],
): () => void {
  const originalConsoleMethods = methodNames.map((methodName) => ({
    methodName,
    method: console[methodName],
  }));
  methodNames.forEach((methodName) => {
    console[methodName] = mockFunction;
  });
  return function restoreConsole() {
    originalConsoleMethods.forEach(({ methodName, method }) => {
      console[methodName] = method;
    });
  };
}

export function getE2eTestServerAddress(): string {
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function sleep(ms = 0): Promise<void> {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}
