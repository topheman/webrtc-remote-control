import { mockSessionStorage } from "../test.helpers";
import {
  makeStoreAccessor,
  makeConnectionFilterUtilities,
  makeHumanizeError,
} from "./common";

let sessionStorage = null;

describe("shared/common", () => {
  beforeAll(() => {
    sessionStorage = mockSessionStorage();
  });
  describe("makeStoreAccessor", () => {
    afterEach(() => {
      sessionStorage.clear();
    });
    it("should persist state with default key", () => {
      const { getPeerId, setPeerIdToSessionStorage } = makeStoreAccessor();
      expect(getPeerId()).toBeFalsy();

      setPeerIdToSessionStorage("foo");

      expect(getPeerId()).toBe("foo");
      expect(sessionStorage.getItem("webrtc-remote-control-peer-id")).toBe(
        "foo"
      );
    });
    it("should persist state with default key", () => {
      const { getPeerId, setPeerIdToSessionStorage } =
        makeStoreAccessor("some-other-key");
      expect(getPeerId()).toBeFalsy();

      setPeerIdToSessionStorage("bar");

      expect(getPeerId()).toBe("bar");
      expect(sessionStorage.getItem("some-other-key")).toBe("bar");
    });
  });
  describe("makeConnectionFilterUtilities", () => {
    it("isConnectionFromRemote should return true if conn was issued by remote", () => {
      const { isConnectionFromRemote } = makeConnectionFilterUtilities();
      expect(
        isConnectionFromRemote({ metadata: "from-webrtc-remote-control" })
      ).toBe(true);
    });
  });
  describe("makeHumanizeError", () => {
    it("should be a factory that returns a translating function", () => {
      const humanizeError = makeHumanizeError();
      expect(humanizeError({ type: "browser-incompatible" })).toBe(
        "Your browser doesn't support WebRTC features, please try with a recent browser."
      );
    });
    it("non translated errors should show default message", () => {
      const humanizeError = makeHumanizeError();
      expect(humanizeError({ type: "some-unsupported-error" })).toBe(
        'An error occured (type: "some-unsupported-error")'
      );
    });
  });
});
