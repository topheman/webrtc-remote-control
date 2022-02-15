import { disableConsole } from "../../../test.helpers";

import { makeLogger } from "../common";

describe("common", () => {
  describe("makeLogger", () => {
    it("should return log, info, warn, error methods", () => {
      const restoreConsole = disableConsole();
      const logger = makeLogger();
      expect(Object.keys(logger)).toStrictEqual([
        "log",
        "info",
        "warn",
        "error",
      ]);
      restoreConsole();
    });
    it("logging function should return an array of logs", () => {
      const restoreConsole = disableConsole();
      const logger = makeLogger();
      const a = logger.log("foo");
      const b = logger.log("bar");
      const c = logger.log("baz");
      expect(a).toHaveLength(1);
      expect(b).toHaveLength(2);
      expect(c).toHaveLength(3);
      restoreConsole();
    });
    it("logs should have key and level", () => {
      const restoreConsole = disableConsole();
      const logger = makeLogger();
      const a = logger.log("foo");
      const b = logger.warn("bar");
      expect(a).toHaveLength(1);
      expect(b).toHaveLength(2);
      expect(a[0]).toStrictEqual({ key: 1, level: "log", payload: "foo" });
      expect(b[1]).toStrictEqual({ key: 2, level: "warn", payload: "bar" });
      restoreConsole();
    });
    it("array of logs should be limited to max length and rotate", () => {
      const restoreConsole = disableConsole();
      const logger = makeLogger(() => {}, [], 3);
      const a = logger.log("foo");
      const b = logger.warn("bar");
      const c = logger.log("baz");
      expect(a).toHaveLength(1);
      expect(b).toHaveLength(2);
      expect(c).toHaveLength(3);
      expect(c[0].payload).toBe("foo");
      expect(c[2].payload).toBe("baz");

      const d = logger.log("qux");
      expect(d).toHaveLength(3);
      expect(d[0].payload).toBe("bar");
      expect(d[2].payload).toBe("qux");

      const e = logger.log("quux");
      expect(e).toHaveLength(3);
      expect(e[0].payload).toBe("baz");
      expect(e[2].payload).toBe("quux");

      restoreConsole();
    });
    it("onLog callback should be called on log", () => {
      const restoreConsole = disableConsole();
      const onLog = jest.fn();
      const logger = makeLogger(onLog);
      logger.log("foo");
      expect(onLog).toHaveBeenNthCalledWith(1, [
        { key: 1, level: "log", payload: "foo" },
      ]);
      restoreConsole();
    });
  });
});
