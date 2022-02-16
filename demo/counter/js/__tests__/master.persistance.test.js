import {
  persistCountersToStorage,
  getCountersFromStorage,
} from "../master.persistance";

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

function makeState() {
  return [
    { peerId: "foo", counter: 0 },
    { peerId: "bar", counter: 1 },
    { peerId: "baz", counter: 2 },
  ];
}

describe("master.persistance", () => {
  it("should save an object in sessionStorage when an array is passed", () => {
    persistCountersToStorage(makeState());
    expect(getCountersFromStorage()).toStrictEqual({
      foo: 0,
      bar: 1,
      baz: 2,
    });
  });
});
