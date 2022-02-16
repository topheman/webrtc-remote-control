/* eslint-disable no-console */
export function disableConsole(
  mockFunction = () => {},
  methodNames = ["error", "warn", "log", "info"]
) {
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
