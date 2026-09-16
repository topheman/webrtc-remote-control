import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  persistCountersToStorage,
  getCountersFromStorage,
} from "../../../shared/js/counter.master.persistance";
import type { RemoteCounter } from "../../../shared/js/counter.master.logic";

function makeState(): RemoteCounter[] {
  return [
    { peerId: "foo", counter: 0 },
    { peerId: "bar", counter: 1 },
    { peerId: "baz", counter: 2 },
  ];
}

describe("master.persistance", () => {
  afterEach(() => {
    sessionStorage.clear();
  });
  it("should save an object in sessionStorage when an array is passed", () => {
    persistCountersToStorage(makeState());
    expect(getCountersFromStorage()).toStrictEqual({
      foo: 0,
      bar: 1,
      baz: 2,
    });
  });
});
