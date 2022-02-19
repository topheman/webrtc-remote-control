import { mockSessionStorage } from "../../../test.helpers";
import {
  persistCountersToStorage,
  getCountersFromStorage,
} from "../master.persistance";

function makeState() {
  return [
    { peerId: "foo", counter: 0 },
    { peerId: "bar", counter: 1 },
    { peerId: "baz", counter: 2 },
  ];
}

let sessionStorage = null;

describe("master.persistance", () => {
  beforeAll(() => {
    sessionStorage = mockSessionStorage();
  });
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
