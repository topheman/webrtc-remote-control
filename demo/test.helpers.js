/* eslint-disable no-console */
export function disableConsole(
  mockFunction = () => {},
  methodNames = ["error", "warn", "log", "info"],
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

export function getE2eTestServerAddress() {
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function sleep(ms = 0) {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}
