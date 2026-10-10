import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";

import {
  MasterProvider,
  RemoteProvider,
  useMaster,
  useRemote,
} from "./react.js";
import type { MasterProviderProps, RemoteProviderProps } from "./react.js";
import { disableConsole, makeFakePeer } from "../../core/test.helpers.js";
import type { FakePeer } from "../../core/test.helpers.js";

/**
 * Behavioral baseline for the react binding.
 *
 * The binding is a thin wrapper: it validates its props, builds the core utils, hands a
 * peer to the core `bindConnection` and exposes the resolved api through a hook. There
 * is one provider and one hook per side, so the tests are organised the same way.
 */
describe("react", () => {
  let restoreConsole: () => void = () => {};

  beforeEach(() => {
    restoreConsole = disableConsole();
  });
  afterEach(() => {
    // Testing Library auto-cleans in a global `afterEach`, which only exists when
    // Vitest injects test globals. This suite imports them, so cleanup is explicit.
    cleanup();
    restoreConsole();
  });

  function MasterConsumer() {
    const { ready, api, mode } = useMaster();
    if (!ready) {
      return <div data-testid="out">not-ready</div>;
    }
    // No assertion on `api`: `ready` narrows it.
    return (
      <div data-testid="out">
        {[mode, Object.keys(api).sort().join("|")].join(" ")}
      </div>
    );
  }

  function RemoteConsumer() {
    const { ready, api, mode, masterPeerId } = useRemote();
    if (!ready) {
      return <div data-testid="out">not-ready</div>;
    }
    return (
      <div data-testid="out">
        {[mode, masterPeerId, Object.keys(api).sort().join("|")].join(" ")}
      </div>
    );
  }

  describe("guards", () => {
    it("should require `masterPeerId` on `RemoteProvider`", () => {
      expect(() =>
        render(
          // The guard defends JavaScript callers - the prop is required, so a
          // TypeScript one cannot write this - hence the forced `undefined`.
          <RemoteProvider
            masterPeerId={undefined as unknown as string}
            init={() => makeFakePeer()}
          >
            <RemoteConsumer />
          </RemoteProvider>,
        ),
      ).toThrow("`masterPeerId` prop required by `RemoteProvider`.");
    });

    it("should reject a hook called outside its provider", () => {
      expect(() => render(<MasterConsumer />)).toThrow(
        "`useMaster` must be called inside a `MasterProvider`.",
      );
    });

    it("should reject the other side's hook", () => {
      // The two sides have their own context, so this is caught rather than
      // handing back a master api typed as a remote one.
      expect(() =>
        render(
          <MasterProvider init={() => makeFakePeer()}>
            <RemoteConsumer />
          </MasterProvider>,
        ),
      ).toThrow("`useRemote` must be called inside a `RemoteProvider`.");
    });
  });

  describe("master side", () => {
    it("should call `init` with the core utils and expose the resolved api", async () => {
      const peer = makeFakePeer({ id: "master-peer-id" });
      const init = vi.fn<MasterProviderProps["init"]>(() => peer);

      render(
        <MasterProvider init={init}>
          <MasterConsumer />
        </MasterProvider>,
      );

      expect(init).toHaveBeenCalledTimes(1);
      const initArgs = init.mock.calls[0]?.[0];
      expect(Object.keys(initArgs ?? {}).sort()).toEqual([
        "getPeerId",
        "humanizeError",
        "isConnectionFromRemote",
        "isIgnorableError",
        "mode",
      ]);
      expect(typeof initArgs?.isConnectionFromRemote).toBe("function");
      expect(screen.getByTestId("out").textContent).toBe("not-ready");

      await act(async () => {
        peer.emitOpen("master-peer-id");
      });

      await waitFor(() => {
        expect(screen.getByTestId("out").textContent).toBe(
          "master off|on|sendAll|sendTo",
        );
      });
    });

    it("should disconnect the peer on unmount", () => {
      const peer = makeFakePeer({ id: "master-peer-id" });
      const { unmount } = render(
        <MasterProvider init={() => peer}>
          <MasterConsumer />
        </MasterProvider>,
      );

      unmount();

      expect(peer.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("remote side", () => {
    it("should connect to the master and expose the resolved api", async () => {
      const peer = makeFakePeer({ id: "remote-peer-id" });
      const init = vi.fn<RemoteProviderProps["init"]>(() => peer);

      render(
        <RemoteProvider masterPeerId="master-peer-id" init={init}>
          <RemoteConsumer />
        </RemoteProvider>,
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

      await act(async () => {
        peer.emitOpen("remote-peer-id");
        peer.lastConnection().emitOpen();
      });

      expect(peer.connect).toHaveBeenCalledWith("master-peer-id", {
        serialization: "json",
        metadata: "from-webrtc-remote-control",
      });
      await waitFor(() => {
        expect(screen.getByTestId("out").textContent).toBe(
          "remote master-peer-id off|on|send",
        );
      });
    });

    it("should deliver a message the master sends before the consumer's effect subscribes", async () => {
      const peer = makeFakePeer({ id: "remote-peer-id" });
      const onData =
        vi.fn<(payload: { from: "master" }, data: unknown) => void>();
      function DataConsumer() {
        const { ready, api } = useRemote();
        useEffect(() => {
          if (!ready) {
            return;
          }
          api.on("data", onData);
          return () => {
            api.off("data", onData);
          };
        }, [ready, api]);
        return null;
      }

      render(
        <RemoteProvider masterPeerId="master-peer-id" init={() => peer}>
          <DataConsumer />
        </RemoteProvider>,
      );
      // The connection opens and the master sends at once, before React has
      // rendered the resolved api and run the effect that subscribes.
      await act(async () => {
        peer.emitOpen("remote-peer-id");
        peer.lastConnection().emitOpen();
        await Promise.resolve();
        peer.lastConnection().emitData({ type: "WELCOME" });
      });

      await waitFor(() => {
        expect(onData).toHaveBeenCalledWith(
          { from: "master" },
          { type: "WELCOME" },
        );
      });
    });
  });

  describe("reconnect notice", () => {
    function NoticeConsumer() {
      const { reconnectNotice } = useRemote();
      return (
        <div data-testid="notice">
          {reconnectNotice({
            id: "master-peer-id",
            attempt: 1,
            nextDelayMs: 1000,
          })}
        </div>
      );
    }

    it("should hand out a notice built from the wording it was given", () => {
      render(
        <RemoteProvider
          masterPeerId="master-peer-id"
          init={() => makeFakePeer()}
          reconnectNotice={{ reconnecting: "hold on" }}
        >
          <NoticeConsumer />
        </RemoteProvider>,
      );

      expect(screen.getByTestId("notice").textContent).toBe("hold on");
    });

    it("should hand out core's wording when none was given", () => {
      render(
        <RemoteProvider
          masterPeerId="master-peer-id"
          init={() => makeFakePeer()}
        >
          <NoticeConsumer />
        </RemoteProvider>,
      );

      expect(screen.getByTestId("notice").textContent).toBe(
        "Lost connection to the peer, reconnecting...",
      );
    });

    it("should not rebuild the connection when the wording is a fresh inline object", () => {
      // The same trap `humanErrors` carries: written inline, this is a new
      // object every render, and rebuilding the utilities on it would tear the
      // peer down each time.
      const peer = makeFakePeer();
      const init = vi.fn<RemoteProviderProps["init"]>(() => peer);
      const renderWith = () => (
        <RemoteProvider
          masterPeerId="master-peer-id"
          init={init}
          reconnectNotice={{ reconnecting: "hold on" }}
        >
          <NoticeConsumer />
        </RemoteProvider>
      );
      const { rerender } = render(renderWith());

      rerender(renderWith());
      rerender(renderWith());

      expect(init).toHaveBeenCalledTimes(1);
      expect(peer.disconnect).not.toHaveBeenCalled();
    });
  });

  describe("re-render", () => {
    it("should not re-run `init` when the provider re-renders", () => {
      const init = vi.fn<MasterProviderProps["init"]>(() => makeFakePeer());
      const { rerender } = render(
        <MasterProvider init={init}>
          <MasterConsumer />
        </MasterProvider>,
      );

      expect(init).toHaveBeenCalledTimes(1);

      rerender(
        <MasterProvider init={init}>
          <MasterConsumer />
        </MasterProvider>,
      );

      expect(init).toHaveBeenCalledTimes(1);
    });

    it("should not re-run `init` when the `init` prop is a fresh inline function", () => {
      // What every consumer actually writes: `init={({ getPeerId }) => new Peer(...)}`.
      // A new identity every render is the normal case, not an abuse.
      const peer = makeFakePeer();
      const calls: number[] = [];
      const renderWith = (n: number) => (
        <MasterProvider
          init={() => {
            calls.push(n);
            return peer;
          }}
        >
          <MasterConsumer />
        </MasterProvider>
      );
      const { rerender } = render(renderWith(1));

      expect(calls).toEqual([1]);

      rerender(renderWith(2));
      rerender(renderWith(3));

      expect(calls).toEqual([1]);
      expect(peer.disconnect).not.toHaveBeenCalled();
    });

    it("should rebuild the connection when `masterPeerId` changes", () => {
      const first = makeFakePeer({ id: "remote-peer-id" });
      const second = makeFakePeer({ id: "remote-peer-id" });

      const init = vi
        .fn<RemoteProviderProps["init"]>()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second);
      const { rerender } = render(
        <RemoteProvider masterPeerId="first-master" init={init}>
          <RemoteConsumer />
        </RemoteProvider>,
      );

      rerender(
        <RemoteProvider masterPeerId="second-master" init={init}>
          <RemoteConsumer />
        </RemoteProvider>,
      );

      expect(init).toHaveBeenCalledTimes(2);
      expect(first.disconnect).toHaveBeenCalledTimes(1);
      // The rebuilt connection is the one that carries the new id.
      expect(init.mock.calls[1]?.[0].masterPeerId).toBe("second-master");
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
      const init = vi.fn<RemoteProviderProps["init"]>(nextPeer);
      const seen: unknown[] = [];
      function PeerConsumer() {
        seen.push(useRemote().peer);
        return <RemoteConsumer />;
      }
      render(
        <RemoteProvider masterPeerId="master-peer-id" init={init}>
          <PeerConsumer />
        </RemoteProvider>,
      );
      const { isIgnorableError } = init.mock.calls[0]![0];

      act(() => peers[0]!.emitIdTaken());
      expect(isIgnorableError(idTaken)).toBe(true);
      act(() => vi.advanceTimersByTime(999));
      expect(init).toHaveBeenCalledTimes(1);
      act(() => vi.advanceTimersByTime(1));
      expect(init).toHaveBeenCalledTimes(2);
      expect(init.mock.calls[1]![0].getPeerId()).toBe("stored-id");
      expect(seen.at(-1)).toBe(peers[1]);

      await act(async () => {
        peers[1]!.emitOpen();
        peers[1]!.lastConnection().emitOpen();
      });

      expect(screen.getByTestId("out").textContent).toBe(
        "remote master-peer-id off|on|send",
      );
      expect(isIgnorableError(idTaken)).toBe(false);
    });

    it("should ignore every refusal of a master's id and connect it with that id", async () => {
      const init = vi.fn<MasterProviderProps["init"]>(nextPeer);
      render(
        <MasterProvider init={init}>
          <MasterConsumer />
        </MasterProvider>,
      );
      const { isIgnorableError } = init.mock.calls[0]![0];

      for (const delay of [1000, 2000]) {
        act(() => peers.at(-1)!.emitIdTaken());
        expect(isIgnorableError(idTaken)).toBe(true);
        act(() => vi.advanceTimersByTime(delay));
      }
      expect(init.mock.calls.map(([utils]) => utils.getPeerId())).toEqual([
        "stored-id",
        "stored-id",
        "stored-id",
      ]);

      await act(async () => peers[2]!.emitOpen());

      expect(screen.getByTestId("out").textContent).toBe(
        "master off|on|sendAll|sendTo",
      );
      expect(isIgnorableError(idTaken)).toBe(false);
    });

    it("should ask for a fresh id after five refusals", () => {
      const init = vi.fn<MasterProviderProps["init"]>(nextPeer);
      render(
        <MasterProvider init={init}>
          <MasterConsumer />
        </MasterProvider>,
      );

      for (const delay of [1000, 2000, 4000, 8000, 8000]) {
        act(() => peers.at(-1)!.emitIdTaken());
        act(() => vi.advanceTimersByTime(delay));
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
      const init = vi.fn<MasterProviderProps["init"]>(nextPeer);
      render(
        <MasterProvider init={init}>
          <MasterConsumer />
        </MasterProvider>,
      );

      for (const delay of [1000, 2000, 4000, 8000, 8000, 8000]) {
        act(() => peers.at(-1)!.emitIdTaken());
        act(() => vi.advanceTimersByTime(delay));
      }
      expect(init).toHaveBeenCalledTimes(7);
      expect(init.mock.calls.at(-1)![0].getPeerId()).toBe("stored-id");

      visibility.mockReturnValue("visible");
      act(() => peers.at(-1)!.emitIdTaken());
      act(() => vi.advanceTimersByTime(8000));
      expect(init.mock.calls.at(-1)![0].getPeerId()).toBeUndefined();
    });

    it("should not retry a fresh id the server refuses", () => {
      const init = vi.fn<MasterProviderProps["init"]>(nextPeer);
      render(
        <MasterProvider init={init}>
          <MasterConsumer />
        </MasterProvider>,
      );
      const { isIgnorableError } = init.mock.calls[0]![0];

      for (const delay of [1000, 2000, 4000, 8000, 8000, 8000]) {
        act(() => peers.at(-1)!.emitIdTaken());
        act(() => vi.advanceTimersByTime(delay));
      }

      expect(init).toHaveBeenCalledTimes(6);
      expect(isIgnorableError(idTaken)).toBe(false);
    });

    it("should not retry once the provider unmounts", () => {
      const init = vi.fn<MasterProviderProps["init"]>(nextPeer);
      const { unmount } = render(
        <MasterProvider init={init}>
          <MasterConsumer />
        </MasterProvider>,
      );
      act(() => peers[0]!.emitIdTaken());

      unmount();
      vi.advanceTimersByTime(1000);

      expect(init).toHaveBeenCalledTimes(1);
    });

    it("should leave an `unavailable-id` after the first open to the application", async () => {
      const init = vi.fn<MasterProviderProps["init"]>(nextPeer);
      render(
        <MasterProvider init={init}>
          <MasterConsumer />
        </MasterProvider>,
      );
      const { isIgnorableError } = init.mock.calls[0]![0];
      expect(isIgnorableError({ type: "network" })).toBe(false);

      await act(async () => peers[0]!.emitOpen());
      act(() => peers[0]!.emitIdTaken());
      act(() => vi.advanceTimersByTime(8000));

      expect(isIgnorableError(idTaken)).toBe(false);
      expect(init).toHaveBeenCalledTimes(1);
    });
  });
});
