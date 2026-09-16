import { describe, expect, it } from "vite-plus/test";
import { counterReducer } from "../../../shared/js/counter.master.logic";
import type { RemoteCounter } from "../../../shared/js/counter.master.logic";

function makeInitialState(): RemoteCounter[] {
  return [
    { peerId: "foo", counter: 0 },
    { peerId: "bar", counter: 0 },
    { peerId: "baz", counter: 0 },
  ];
}

describe("master.logic", () => {
  describe("counterReducer", () => {
    it("should return default state if no action passed", () => {
      // The reducer never reads `data` unless a peer id matches, so an empty
      // action is a legitimate call that the typed signature has no way to
      // spell. The assertion below is a tautology and was one before the port
      // too - left alone rather than quietly given teeth here.
      const result = counterReducer(
        makeInitialState(),
        {} as Parameters<typeof counterReducer>[1],
      );
      expect(result).toStrictEqual(result);
    });
    it("should return new correct state with COUNTER_INCREMENT", () => {
      const result = counterReducer(makeInitialState(), {
        data: {
          type: "COUNTER_INCREMENT",
        },
        id: "bar",
      });
      expect(result).toStrictEqual([
        { peerId: "foo", counter: 0 },
        { peerId: "bar", counter: 1 },
        { peerId: "baz", counter: 0 },
      ]);
    });
    it("should return new correct state with COUNTER_DECREMENT", () => {
      const result = counterReducer(makeInitialState(), {
        data: {
          type: "COUNTER_DECREMENT",
        },
        id: "bar",
      });
      expect(result).toStrictEqual([
        { peerId: "foo", counter: 0 },
        { peerId: "bar", counter: -1 },
        { peerId: "baz", counter: 0 },
      ]);
    });
    it("should return new correct state with REMOTE_SET_NAME", () => {
      const result = counterReducer(makeInitialState(), {
        data: {
          type: "REMOTE_SET_NAME",
          name: "tophe",
        },
        id: "bar",
      });
      expect(result).toStrictEqual([
        { peerId: "foo", counter: 0 },
        { peerId: "bar", counter: 0, name: "tophe" },
        { peerId: "baz", counter: 0 },
      ]);
    });
  });
});
