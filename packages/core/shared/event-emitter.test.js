import { eventEmitter } from "./event-emitter";

describe("shared/event-emitter", () => {
  it("should return an object with on, off, emit methods", () => {
    expect(Object.keys(eventEmitter())).toStrictEqual(["on", "off", "emit"]);
  });
  it("should execute a registered callback", () => {
    const bus = eventEmitter();
    const foo = jest.fn();
    bus.on("foo", foo);
    bus.emit("foo");
    expect(foo).toHaveBeenCalledTimes(1);
  });
  it("should execute a registered callback emitted multiple times", () => {
    const bus = eventEmitter();
    const foo = jest.fn();
    bus.on("foo", foo);
    bus.emit("foo");
    bus.emit("foo");
    bus.emit("foo");
    expect(foo).toHaveBeenCalledTimes(3);
  });
  it("should execute a registered callback with arguments passed", () => {
    const bus = eventEmitter();
    const foo = jest.fn();
    bus.on("foo", foo);
    bus.emit("foo", 1, 2, 3);
    expect(foo).toHaveBeenCalledTimes(1);
    expect(foo).toHaveBeenCalledWith(1, 2, 3);
  });
  it("should execute multiple registered callback on the same event", () => {
    const bus = eventEmitter();
    const foo1 = jest.fn();
    const foo2 = jest.fn();
    bus.on("foo", foo1);
    bus.on("foo", foo2);
    bus.emit("foo");
    expect(foo1).toHaveBeenCalledTimes(1);
    expect(foo2).toHaveBeenCalledTimes(1);
  });
  it("should not execute unregistered callbacks", () => {
    const bus = eventEmitter();
    const foo1 = jest.fn();
    const foo2 = jest.fn();
    bus.on("foo", foo1);
    bus.on("foo", foo2);
    bus.off("foo", foo1);
    bus.emit("foo");
    expect(foo1).toHaveBeenCalledTimes(0);
    expect(foo2).toHaveBeenCalledTimes(1);
  });
  it("should clean up all callbacks out of an event if no function is passed", () => {
    const bus = eventEmitter();
    const foo1 = jest.fn();
    const foo2 = jest.fn();
    bus.on("foo", foo1);
    bus.on("foo", foo2);
    bus.off("foo");
    bus.emit("foo");
    expect(foo1).toHaveBeenCalledTimes(0);
    expect(foo2).toHaveBeenCalledTimes(0);
  });
});
