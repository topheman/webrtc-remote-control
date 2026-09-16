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
