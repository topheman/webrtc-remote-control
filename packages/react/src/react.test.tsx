import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

import {
  MasterProvider,
  RemoteProvider,
  useMaster,
  useRemote,
} from "./react.js";
import type { MasterProviderProps, RemoteProviderProps } from "./react.js";
import { disableConsole, makeFakePeer } from "../../core/test.helpers.js";

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
      // does get a `reconnectNotice`, which the master side has no use for.
      expect(Object.keys(init.mock.calls[0]?.[0] ?? {}).sort()).toEqual([
        "getPeerId",
        "humanizeError",
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
});
