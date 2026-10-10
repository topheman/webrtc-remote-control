import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { defineComponent, h, nextTick } from "vue";
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
import type { FakePeer } from "../../core/test.helpers.js";

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
  // `unknown`, because that is what `provideRemote` hands `init`: the notice
  // types are decided by the wording in the options, not by this callback.
  type RemoteInit = (
    utils: RemoteUtils<unknown, unknown>,
  ) => ReturnType<typeof makeFakePeer>;

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
        "isIgnorableError",
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
      // offered one - it is not on the type, and not on the value either. It
      // does get `reconnectNotice`, which the master side has no use for.
      expect(Object.keys(init.mock.calls[0]?.[0] ?? {}).sort()).toEqual([
        "getPeerId",
        "humanizeError",
        "isIgnorableError",
        "masterPeerId",
        "mode",
        "reconnectNotice",
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

    it("should build the reconnect notice from the wording `provideRemote` was given", () => {
      const init = vi.fn<RemoteInit>(() => makeFakePeer());

      render(
        makeRemoteRoot(init, {
          masterPeerId: "master-peer-id",
          reconnectNotice: { reconnecting: "hold on" },
        }),
      );

      const initArgs = init.mock.calls[0]?.[0];
      expect(
        initArgs?.reconnectNotice({
          id: "master-peer-id",
          attempt: 1,
          nextDelayMs: 1000,
        }),
      ).toBe("hold on");
    });

    it("should fall back to core's wording when `provideRemote` was given none", () => {
      const init = vi.fn<RemoteInit>(() => makeFakePeer());

      render(makeRemoteRoot(init, { masterPeerId: "master-peer-id" }));

      const initArgs = init.mock.calls[0]?.[0];
      expect(
        initArgs?.reconnectNotice({
          id: "master-peer-id",
          attempt: 1,
          nextDelayMs: 1000,
        }),
      ).toBe("Lost connection to the peer, reconnecting...");
    });
  });

  describe("id taken before the first open", () => {
    const idTaken = { type: "unavailable-id" };
    let peers: FakePeer[];
    const nextPeer = () => {
      const peer = makeFakePeer({ id: "stored-id" });
      peers.push(peer);
      return peer;
    };

    beforeEach(() => {
      vi.useFakeTimers();
      peers = [];
      sessionStorage.setItem("webrtc-remote-control-peer-id", "stored-id");
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      sessionStorage.clear();
    });

    it("should build a new peer after the delay and connect with it", async () => {
      const init = vi.fn<RemoteInit>(nextPeer);
      let state: ReturnType<typeof useRemote>["state"] | undefined;
      const StateConsumer = defineComponent({
        setup() {
          state = useRemote().state;
        },
        render: () => h(RemoteConsumer),
      });
      const { getByTestId } = render(
        makeRemoteRoot(init, { masterPeerId: "master-peer-id" }, StateConsumer),
      );
      const { isIgnorableError } = init.mock.calls[0]![0];

      peers[0]!.emitIdTaken();
      expect(isIgnorableError(idTaken)).toBe(true);
      vi.advanceTimersByTime(999);
      expect(init).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(init).toHaveBeenCalledTimes(2);
      expect(init.mock.calls[1]![0].getPeerId()).toBe("stored-id");
      expect(state?.value.peer).toBe(peers[1]);

      peers[1]!.emitOpen();
      peers[1]!.lastConnection().emitOpen();
      await vi.advanceTimersByTimeAsync(0);
      await nextTick();

      expect(getByTestId("out").textContent).toBe(
        "remote master-peer-id off|on|send",
      );
      expect(isIgnorableError(idTaken)).toBe(false);
    });

    it("should ignore every refusal of a master's id and connect it with that id", async () => {
      const init = vi.fn<MasterInit>(nextPeer);
      const { getByTestId } = render(makeMasterRoot(init));
      const { isIgnorableError } = init.mock.calls[0]![0];

      for (const delay of [1000, 2000]) {
        peers.at(-1)!.emitIdTaken();
        expect(isIgnorableError(idTaken)).toBe(true);
        vi.advanceTimersByTime(delay);
      }
      expect(init.mock.calls.map(([utils]) => utils.getPeerId())).toEqual([
        "stored-id",
        "stored-id",
        "stored-id",
      ]);

      peers[2]!.emitOpen();
      await vi.advanceTimersByTimeAsync(0);
      await nextTick();

      expect(getByTestId("out").textContent).toBe(
        "master off|on|sendAll|sendTo",
      );
      expect(isIgnorableError(idTaken)).toBe(false);
    });

    it("should ask for a fresh id after five refusals", () => {
      const init = vi.fn<MasterInit>(nextPeer);
      render(makeMasterRoot(init));

      for (const delay of [1000, 2000, 4000, 8000, 8000]) {
        peers.at(-1)!.emitIdTaken();
        vi.advanceTimersByTime(delay);
      }

      expect(init).toHaveBeenCalledTimes(6);
      expect(init.mock.calls.map(([utils]) => utils.getPeerId())).toEqual([
        "stored-id",
        "stored-id",
        "stored-id",
        "stored-id",
        "stored-id",
        undefined,
      ]);
    });

    it("should keep the stored id while a hidden master is refused", () => {
      const visibility = vi
        .spyOn(document, "visibilityState", "get")
        .mockReturnValue("hidden");
      const init = vi.fn<MasterInit>(nextPeer);
      render(makeMasterRoot(init));

      for (const delay of [1000, 2000, 4000, 8000, 8000, 8000]) {
        peers.at(-1)!.emitIdTaken();
        vi.advanceTimersByTime(delay);
      }
      expect(init).toHaveBeenCalledTimes(7);
      expect(init.mock.calls.at(-1)![0].getPeerId()).toBe("stored-id");

      visibility.mockReturnValue("visible");
      peers.at(-1)!.emitIdTaken();
      vi.advanceTimersByTime(8000);
      expect(init.mock.calls.at(-1)![0].getPeerId()).toBeUndefined();
    });

    it("should not retry a fresh id the server refuses", () => {
      const init = vi.fn<MasterInit>(nextPeer);
      render(makeMasterRoot(init));
      const { isIgnorableError } = init.mock.calls[0]![0];

      for (const delay of [1000, 2000, 4000, 8000, 8000, 8000]) {
        peers.at(-1)!.emitIdTaken();
        vi.advanceTimersByTime(delay);
      }

      expect(init).toHaveBeenCalledTimes(6);
      expect(isIgnorableError(idTaken)).toBe(false);
    });

    it("should not retry once the provider unmounts", () => {
      const init = vi.fn<MasterInit>(nextPeer);
      const { unmount } = render(makeMasterRoot(init));
      peers[0]!.emitIdTaken();

      unmount();
      vi.advanceTimersByTime(1000);

      expect(init).toHaveBeenCalledTimes(1);
    });

    it("should leave an `unavailable-id` after the first open to the application", () => {
      const init = vi.fn<MasterInit>(nextPeer);
      render(makeMasterRoot(init));
      const { isIgnorableError } = init.mock.calls[0]![0];
      expect(isIgnorableError({ type: "network" })).toBe(false);

      peers[0]!.emitOpen();
      peers[0]!.emitIdTaken();
      vi.advanceTimersByTime(8000);

      expect(isIgnorableError(idTaken)).toBe(false);
      expect(init).toHaveBeenCalledTimes(1);
    });
  });
});
