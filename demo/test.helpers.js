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

export function mockSessionStorage() {
  class SessionStorageMock {
    constructor() {
      this.store = {};
    }

    clear() {
      this.store = {};
    }

    getItem(key) {
      return this.store[key] || null;
    }

    setItem(key, value) {
      this.store[key] = String(value);
    }

    removeItem(key) {
      delete this.store[key];
    }
  }

  global.sessionStorage = new SessionStorageMock();
  return global.sessionStorage;
}

export function getE2eTestServerAddress() {
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function sleep(ms = 0) {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}
