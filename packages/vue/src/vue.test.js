/* eslint-disable import/no-relative-packages */
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { h } from "vue";
import { render, waitFor, cleanup } from "@testing-library/vue";

import { provideWebTCRemoteControl, usePeer } from "./vue";
import { disableConsole, makeFakePeer } from "../../core/test.helpers";

/**
 * Behavioral baseline for the vue binding.
 *
 * Same contract as the react binding, expressed through provide/inject instead of
 * context: three constructor guards, then the resolved-api path against a fake peer.
 */
describe("vue", () => {
  let restoreConsole = null;

  // Disabled for the whole file rather than per test: the provider logs while it is
  // being torn down, which happens in the `cleanup()` below.
  beforeAll(() => {
    restoreConsole = disableConsole();
  });
  afterAll(() => {
    restoreConsole();
  });
  afterEach(() => {
    // Testing Library auto-cleans in a global `afterEach`, which only exists when
    // Vitest injects test globals. This suite imports them, so cleanup is explicit.
    cleanup();
    // The guard tests throw while mounting, so Testing Library never gets to track
    // their container and its own cleanup cannot remove it. Queries are scoped to
    // `document.body`, so a leftover container makes the next `getByTestId` ambiguous.
    document.body.innerHTML = "";
  });

  const Consumer = {
    setup() {
      // `setup` is a vue entry point, not a react component - the react-hooks rule
      // has no way to know that.
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { ready, api, mode, masterPeerId } = usePeer();
      return { ready, api, mode, masterPeerId };
    },
    render() {
      return h(
        "div",
        { "data-testid": "out" },
        this.ready
          ? [
              this.mode,
              this.masterPeerId || "-",
              Object.keys(this.api).sort().join("|"),
            ].join(" ")
          : "not-ready",
      );
    },
  };

  /** Root component that installs the provider, so the child can inject it. */
  function makeRoot(init, mode, options, child = Consumer) {
    return {
      setup() {
        provideWebTCRemoteControl(init, mode, options);
      },
      render() {
        return h(child);
      },
    };
  }

  /**
   * Guard tests render an inert child rather than the consumer. Vue still mounts the
   * subtree after a setup error, and a consumer mounted without a provider blows up
   * asynchronously inside `usePeer`, which would mask the assertion under test.
   */
  const Inert = { render: () => h("div") };

  describe("constructor guards", () => {
    it("should reject an unsupported mode", () => {
      expect(() =>
        render(makeRoot(() => makeFakePeer(), "peer", undefined, Inert)),
      ).toThrow('Unsupported "peer" mode. Only "master", "remote" accepted.');
    });

    it("should reject `masterPeerId` in master mode", () => {
      expect(() =>
        render(
          makeRoot(
            () => makeFakePeer(),
            "master",
            { masterPeerId: "master-peer-id" },
            Inert,
          ),
        ),
      ).toThrow(
        '`masterPeerId` prop not allowed in "master" mode - "master-peer-id" was passed.',
      );
    });

    it("should require `masterPeerId` in remote mode", () => {
      expect(() =>
        render(makeRoot(() => makeFakePeer(), "remote", undefined, Inert)),
      ).toThrow('`masterPeerId` prop required in "remote" mode.');
    });
  });

  describe("master mode", () => {
    it("should call `init` with the core utils and expose the resolved api", async () => {
      const peer = makeFakePeer({ id: "master-peer-id" });
      const init = vi.fn(() => peer);

      const { getByTestId } = render(makeRoot(init, "master"));

      expect(init).toHaveBeenCalledTimes(1);
      expect(Object.keys(init.mock.calls[0][0]).sort()).toEqual([
        "getPeerId",
        "humanizeError",
        "isConnectionFromRemote",
      ]);
      expect(getByTestId("out").textContent).toBe("not-ready");

      peer.emitOpen("master-peer-id");

      await waitFor(() => {
        expect(getByTestId("out").textContent).toBe(
          "master - off|on|sendAll|sendTo",
        );
      });
    });

    it("should disconnect the peer on unmount", () => {
      const peer = makeFakePeer({ id: "master-peer-id" });
      const { unmount } = render(makeRoot(() => peer, "master"));

      unmount();

      expect(peer.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("remote mode", () => {
    it("should connect to the master and expose the resolved api", async () => {
      const peer = makeFakePeer({ id: "remote-peer-id" });
      const init = vi.fn(() => peer);

      const { getByTestId } = render(
        makeRoot(init, "remote", { masterPeerId: "master-peer-id" }),
      );

      // the remote side has no use for the filter, so it is not handed one
      expect(init.mock.calls[0][0].isConnectionFromRemote).toBeUndefined();

      peer.emitOpen("remote-peer-id");
      expect(peer.connect).toHaveBeenCalledWith("master-peer-id", {
        serialization: "json",
        metadata: "from-webrtc-remote-control",
      });
      peer.lastConnection().emitOpen();

      await waitFor(() => {
        expect(getByTestId("out").textContent).toBe(
          "remote master-peer-id off|on|send",
        );
      });
    });
  });

  describe("options", () => {
    it("should forward sessionStorageKey and humanErrors to the core utils", () => {
      const init = vi.fn(() => makeFakePeer());

      render(
        makeRoot(init, "master", {
          sessionStorageKey: "my-key",
          humanErrors: { mapping: { network: "My custom message" } },
        }),
      );

      const { humanizeError, getPeerId } = init.mock.calls[0][0];
      expect(humanizeError({ type: "network" })).toBe("My custom message");
      window.sessionStorage.setItem("my-key", "stored-peer-id");
      expect(getPeerId()).toBe("stored-peer-id");
    });
  });
});
