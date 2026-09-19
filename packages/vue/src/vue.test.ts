import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { defineComponent, h } from "vue";
import type { Component } from "vue";
import { cleanup, render, waitFor } from "@testing-library/vue";

import { provideMaster, provideRemote, useMaster, useRemote } from "./vue.js";
import type {
  MasterUtils,
  ProvideOptions,
  ProvideRemoteOptions,
  RemoteUtils,
} from "./vue.js";
import { disableConsole, makeFakePeer } from "../../core/test.helpers.js";

/**
 * Behavioral baseline for the vue binding.
 *
 * Same contract as the react binding, expressed through provide/inject instead of
 * context: one composable and one hook per side, then the resolved-api path
 * against a fake peer.
 */
describe("vue", () => {
  let restoreConsole: () => void = () => {};

  // Disabled for the whole file rather than per test: core still logs while a
  // connection is being torn down, which happens in the `cleanup()` below.
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

  const MasterConsumer = defineComponent({
    setup() {
      const { state, mode } = useMaster();
      return { state, mode };
    },
    render() {
      // No assertion on `api`: reading `ready` off the same value narrows it.
      return h(
        "div",
        { "data-testid": "out" },
        this.state.ready
          ? [this.mode, Object.keys(this.state.api).sort().join("|")].join(" ")
          : "not-ready",
      );
    },
  });

  const RemoteConsumer = defineComponent({
    setup() {
      const { state, mode, masterPeerId } = useRemote();
      return { state, mode, masterPeerId };
    },
    render() {
      return h(
        "div",
        { "data-testid": "out" },
        this.state.ready
          ? [
              this.mode,
              this.masterPeerId,
              Object.keys(this.state.api).sort().join("|"),
            ].join(" ")
          : "not-ready",
      );
    },
  });

  type MasterInit = (utils: MasterUtils) => ReturnType<typeof makeFakePeer>;
  type RemoteInit = (utils: RemoteUtils) => ReturnType<typeof makeFakePeer>;

  /** Root component that installs the master provider, so the child can inject it. */
  function makeMasterRoot(
    init: MasterInit,
    options?: ProvideOptions,
    child: Component = MasterConsumer,
  ) {
    return defineComponent({
      setup() {
        provideMaster(init, options);
      },
      render() {
        return h(child);
      },
    });
  }

  function makeRemoteRoot(
    init: RemoteInit,
    options: ProvideRemoteOptions,
    child: Component = RemoteConsumer,
  ) {
    return defineComponent({
      setup() {
        provideRemote(init, options);
      },
      render() {
        return h(child);
      },
    });
  }

  /**
   * Guard tests render an inert child rather than the consumer. Vue still mounts the
   * subtree after a setup error, and a consumer mounted without a provider blows up
   * asynchronously inside the hook, which would mask the assertion under test.
   */
  const Inert = defineComponent({ render: () => h("div") });

  describe("guards", () => {
    it("should require `masterPeerId` on `provideRemote`", () => {
      expect(() =>
        render(
          makeRemoteRoot(
            () => makeFakePeer(),
            // The guard defends JavaScript callers - the option is required, so
            // a TypeScript one cannot write this.
            { masterPeerId: undefined as unknown as string },
            Inert,
          ),
        ),
      ).toThrow("`masterPeerId` option required by `provideRemote`.");
    });

    it("should reject a hook called outside its provider", () => {
      expect(() => render(MasterConsumer)).toThrow(
        "`useMaster` must be called under a component that called `provideMaster`.",
      );
    });

    it("should reject the other side's hook", () => {
      // The two sides have their own injection key, so this is caught rather
      // than handing back a master api typed as a remote one.
      expect(() =>
        render(makeMasterRoot(() => makeFakePeer(), undefined, RemoteConsumer)),
      ).toThrow(
        "`useRemote` must be called under a component that called `provideRemote`.",
      );
    });
  });

  describe("master side", () => {
    it("should call `init` with the core utils and expose the resolved api", async () => {
      const peer = makeFakePeer({ id: "master-peer-id" });
      const init = vi.fn<MasterInit>(() => peer);

      const { getByTestId } = render(makeMasterRoot(init));

      expect(init).toHaveBeenCalledTimes(1);
      const initArgs = init.mock.calls[0]?.[0];
      expect(Object.keys(initArgs ?? {}).sort()).toEqual([
        "getPeerId",
        "humanizeError",
        "isConnectionFromRemote",
        "mode",
      ]);
      expect(getByTestId("out").textContent).toBe("not-ready");

      peer.emitOpen("master-peer-id");

      await waitFor(() => {
        expect(getByTestId("out").textContent).toBe(
          "master off|on|sendAll|sendTo",
        );
      });
    });

    it("should disconnect the peer on unmount", () => {
      const peer = makeFakePeer({ id: "master-peer-id" });
      const { unmount } = render(makeMasterRoot(() => peer));

      unmount();

      expect(peer.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("remote side", () => {
    it("should connect to the master and expose the resolved api", async () => {
      const peer = makeFakePeer({ id: "remote-peer-id" });
      const init = vi.fn<RemoteInit>(() => peer);

      const { getByTestId } = render(
        makeRemoteRoot(init, { masterPeerId: "master-peer-id" }),
      );

      // The remote side has no use for the connection filter, so it is not
      // offered one - it is not on the type, and not on the value either.
      expect(Object.keys(init.mock.calls[0]?.[0] ?? {}).sort()).toEqual([
        "getPeerId",
        "humanizeError",
        "masterPeerId",
        "mode",
      ]);

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
      const init = vi.fn<MasterInit>(() => makeFakePeer());

      render(
        makeMasterRoot(init, {
          sessionStorageKey: "my-key",
          humanErrors: { mapping: { network: "My custom message" } },
        }),
      );

      const initArgs = init.mock.calls[0]?.[0];
      expect(initArgs?.humanizeError({ type: "network" })).toBe(
        "My custom message",
      );
      window.sessionStorage.setItem("my-key", "stored-peer-id");
      expect(initArgs?.getPeerId()).toBe("stored-peer-id");
    });
  });
});
