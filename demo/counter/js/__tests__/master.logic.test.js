import { counterReducer } from "../master.logic";

function makeInitialState() {
  return [
    { peerId: "foo", counter: 0 },
    { peerId: "bar", counter: 0 },
    { peerId: "baz", counter: 0 },
  ];
}

describe("master.logic", () => {
  describe("counterReducer", () => {
    it("should return default state if no action passed", () => {
      const result = counterReducer(makeInitialState(), {});
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
