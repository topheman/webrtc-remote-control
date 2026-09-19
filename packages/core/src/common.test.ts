import { afterEach, describe, expect, expectTypeOf, it } from "vite-plus/test";
import {
  makeStoreAccessor,
  makeConnectionFilterUtilities,
  makeHumanizeError,
  makeReconnectNotice,
  prepareUtils,
} from "./common.js";

describe("common", () => {
  describe("makeStoreAccessor", () => {
    afterEach(() => {
      sessionStorage.clear();
    });
    it("should persist state with default key", () => {
      const { getPeerId, setPeerIdToSessionStorage } = makeStoreAccessor();
      expect(getPeerId()).toBeUndefined();

      setPeerIdToSessionStorage("foo");

      expect(getPeerId()).toBe("foo");
      expect(sessionStorage.getItem("webrtc-remote-control-peer-id")).toBe(
        "foo",
      );
    });
    it("should persist state with default key", () => {
      const { getPeerId, setPeerIdToSessionStorage } =
        makeStoreAccessor("some-other-key");
      expect(getPeerId()).toBeUndefined();

      setPeerIdToSessionStorage("bar");

      expect(getPeerId()).toBe("bar");
      expect(sessionStorage.getItem("some-other-key")).toBe("bar");
    });
  });
  describe("makeConnectionFilterUtilities", () => {
    it("isConnectionFromRemote should return true if conn was issued by remote", () => {
      const { isConnectionFromRemote } = makeConnectionFilterUtilities();
      expect(
        isConnectionFromRemote({ metadata: "from-webrtc-remote-control" }),
      ).toBe(true);
    });
    it("isConnectionFromRemote should return false for a connection the user opened", () => {
      const { isConnectionFromRemote } = makeConnectionFilterUtilities();
      expect(isConnectionFromRemote({ metadata: undefined })).toBe(false);
      expect(isConnectionFromRemote({ metadata: "something-else" })).toBe(
        false,
      );
    });
    it("should expose the metadata it filters on", () => {
      const { connMetadata } = makeConnectionFilterUtilities();
      expect(connMetadata).toBe("from-webrtc-remote-control");
    });
  });
  describe("makeHumanizeError", () => {
    it("should be a factory that returns a translating function", () => {
      const humanizeError = makeHumanizeError();
      expect(humanizeError({ type: "browser-incompatible" })).toBe(
        "Your browser doesn't support WebRTC features, please try with a recent browser.",
      );
    });
    it("non translated errors should show default message", () => {
      const humanizeError = makeHumanizeError();
      expect(humanizeError({ type: "some-unsupported-error" })).toBe(
        "An error occured - type: some-unsupported-error",
      );
    });
    it("you should be able to pass a mapping", () => {
      const humanizeError = makeHumanizeError({
        mapping: {
          network: "My custom message",
        },
      });
      expect(humanizeError({ type: "network" })).toBe("My custom message");
    });
    it("should have error.message by default if present", () => {
      const humanizeError = makeHumanizeError();
      expect(
        humanizeError({
          type: "network",
          message: "Lost connection to server.",
        }),
      ).toBe(
        "It seems you're experimenting some network problems. (Lost connection to server.)",
      );
    });
    it("should NOT have error.message of withTechicalErrorMessage = false", () => {
      const humanizeError = makeHumanizeError({
        withTechicalErrorMessage: false,
      });
      expect(
        humanizeError({
          type: "network",
          message: "Lost connection to server.",
        }),
      ).toBe("It seems you're experimenting some network problems.");
    });
    it("should drop error.message for unmapped errors too when withTechicalErrorMessage = false", () => {
      const humanizeError = makeHumanizeError({
        withTechicalErrorMessage: false,
      });
      expect(
        humanizeError({ type: "some-unsupported-error", message: "Boom." }),
      ).toBe("An error occured - type: some-unsupported-error");
    });
    it("should accept a function as the `default` mapping", () => {
      const humanizeError = makeHumanizeError({
        mapping: {
          default: (error) => `Custom fallback for "${error.type}"`,
        },
      });
      expect(humanizeError({ type: "some-unsupported-error" })).toBe(
        'Custom fallback for "some-unsupported-error"',
      );
    });
    it("should accept a plain string as the `default` mapping", () => {
      const humanizeError = makeHumanizeError({
        mapping: { default: "Something went wrong." },
      });
      expect(humanizeError({ type: "some-unsupported-error" })).toBe(
        "Something went wrong.",
      );
    });
    it("should append error.message to a function-valued default", () => {
      const humanizeError = makeHumanizeError({
        mapping: { default: (error) => `Custom fallback for "${error.type}"` },
        withTechicalErrorMessage: true,
      });
      expect(
        humanizeError({ type: "some-unsupported-error", message: "Boom." }),
      ).toBe('Custom fallback for "some-unsupported-error" (Boom.)');
    });
    it("should handle an error with no type at all", () => {
      const humanizeError = makeHumanizeError();
      expect(humanizeError({})).toBe("An error occured");
    });
  });
  describe("makeReconnectNotice", () => {
    const attempt = (nextDelayMs: number, n = 1) => ({
      id: "remote-peer-id",
      attempt: n,
      nextDelayMs,
    });

    it("should hold a quiet notice while the delay is still growing", () => {
      const reconnectNotice = makeReconnectNotice();

      expect(reconnectNotice(attempt(1000))).toBe(
        "Lost connection to the peer, reconnecting...",
      );
      expect(reconnectNotice(attempt(4000, 3))).toBe(
        "Lost connection to the peer, reconnecting...",
      );
    });

    it("should escalate once the delay reaches the ceiling", () => {
      const reconnectNotice = makeReconnectNotice();

      // The ceiling is the library's number, which is the whole point: a
      // consumer picks the wording, never the threshold.
      expect(reconnectNotice(attempt(8000, 4))).toContain("4 attempts");
      expect(reconnectNotice(attempt(8000, 9))).toContain("try reloading");
    });

    it("should take an override as a value or as a function of the payload", () => {
      const reconnectNotice = makeReconnectNotice({
        reconnecting: "hold on",
        stalled: ({ attempt: n }) => `gave up after ${n}`,
      });

      expect(reconnectNotice(attempt(2000))).toBe("hold on");
      expect(reconnectNotice(attempt(8000, 6))).toBe("gave up after 6");
    });

    it("should keep core's wording for the side that was not overridden", () => {
      const reconnectNotice = makeReconnectNotice({ stalled: "gone" });

      expect(reconnectNotice(attempt(1000))).toBe(
        "Lost connection to the peer, reconnecting...",
      );
      expect(reconnectNotice(attempt(8000, 4))).toBe("gone");
    });

    it("should infer a richer message type from the overrides", () => {
      // Nothing here is a string, and no annotation or cast was needed at the
      // call site - the type parameters come from the options.
      const reconnectNotice = makeReconnectNotice({
        reconnecting: { level: "info" as const, retrying: true },
        stalled: ({ attempt: n }) => ({ level: "warn" as const, tries: n }),
      });

      expect(reconnectNotice(attempt(1000))).toEqual({
        level: "info",
        retrying: true,
      });
      expect(reconnectNotice(attempt(8000, 4))).toEqual({
        level: "warn",
        tries: 4,
      });
      expectTypeOf(reconnectNotice(attempt(1000))).toEqualTypeOf<
        { level: "info"; retrying: boolean } | { level: "warn"; tries: number }
      >();
    });
  });

  describe("prepareUtils", () => {
    afterEach(() => {
      sessionStorage.clear();
    });
    it("should expose the utilities the master and remote sides need", () => {
      expect(Object.keys(prepareUtils()).sort()).toEqual([
        "getPeerId",
        "humanizeError",
        "isConnectionFromRemote",
        "reconnectNotice",
        "setPeerIdToSessionStorage",
      ]);
    });
    it("should wire reconnectNotice to the overrides it was given", () => {
      const { reconnectNotice } = prepareUtils({
        reconnectNotice: { reconnecting: "hold on" },
      });

      expect(reconnectNotice({ id: "a", attempt: 1, nextDelayMs: 1000 })).toBe(
        "hold on",
      );
      // The stalled side was not overridden, so it still comes from core.
      expect(
        reconnectNotice({ id: "a", attempt: 4, nextDelayMs: 8000 }),
      ).toContain("4 attempts");
    });
    it("should wire the store accessor to the default key", () => {
      const { getPeerId, setPeerIdToSessionStorage } = prepareUtils();
      setPeerIdToSessionStorage("foo");
      expect(getPeerId()).toBe("foo");
      expect(sessionStorage.getItem("webrtc-remote-control-peer-id")).toBe(
        "foo",
      );
    });
    it("should forward sessionStorageKey and humanErrors", () => {
      const { getPeerId, setPeerIdToSessionStorage, humanizeError } =
        prepareUtils({
          sessionStorageKey: "my-key",
          humanErrors: { mapping: { network: "My custom message" } },
        });
      setPeerIdToSessionStorage("bar");
      expect(getPeerId()).toBe("bar");
      expect(sessionStorage.getItem("my-key")).toBe("bar");
      expect(humanizeError({ type: "network" })).toBe("My custom message");
    });
  });
});
