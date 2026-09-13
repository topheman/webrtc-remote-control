/* eslint-disable import/no-relative-packages */
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";

import { WebRTCRemoteControlProvider, usePeer } from "./react";
import { disableConsole, makeFakePeer } from "../../core/test.helpers";

/**
 * Behavioral baseline for the react binding.
 *
 * The binding is a thin wrapper: it validates its props, builds the core utils, hands a
 * peer to the core `bindConnection` and exposes the resolved api through a hook. These
 * tests cover the three constructor guards and the resolved-api path, against a fake peer.
 */
describe("react", () => {
  let restoreConsole = null;

  beforeEach(() => {
    restoreConsole = disableConsole();
  });
  afterEach(() => {
    restoreConsole();
  });

  function Consumer() {
    const { ready, api, mode, masterPeerId } = usePeer();
    if (!ready) {
      return <div data-testid="out">not-ready</div>;
    }
    return (
      <div data-testid="out">
        {[mode, masterPeerId || "-", Object.keys(api).sort().join("|")].join(
          " "
        )}
      </div>
    );
  }

  describe("constructor guards", () => {
    it("should reject an unsupported mode", () => {
      expect(() =>
        render(
          <WebRTCRemoteControlProvider mode="peer" init={() => makeFakePeer()}>
            <Consumer />
          </WebRTCRemoteControlProvider>
        )
      ).toThrow('Unsupported "peer" mode. Only "master", "remote" accepted.');
    });

    it("should reject `masterPeerId` in master mode", () => {
      expect(() =>
        render(
          <WebRTCRemoteControlProvider
            mode="master"
            masterPeerId="master-peer-id"
            init={() => makeFakePeer()}
          >
            <Consumer />
          </WebRTCRemoteControlProvider>
        )
      ).toThrow(
        '`masterPeerId` prop not allowed in "master" mode - "master-peer-id" was passed.'
      );
    });

    it("should require `masterPeerId` in remote mode", () => {
      expect(() =>
        render(
          <WebRTCRemoteControlProvider
            mode="remote"
            init={() => makeFakePeer()}
          >
            <Consumer />
          </WebRTCRemoteControlProvider>
        )
      ).toThrow('`masterPeerId` prop required in "remote" mode.');
    });
  });

  describe("master mode", () => {
    it("should call `init` with the core utils and expose the resolved api", async () => {
      const peer = makeFakePeer({ id: "master-peer-id" });
      const init = jest.fn(() => peer);

      render(
        <WebRTCRemoteControlProvider mode="master" init={init}>
          <Consumer />
        </WebRTCRemoteControlProvider>
      );

      expect(init).toHaveBeenCalledTimes(1);
      const initArgs = init.mock.calls[0][0];
      expect(Object.keys(initArgs).sort()).toEqual([
        "getPeerId",
        "humanizeError",
        "isConnectionFromRemote",
      ]);
      expect(typeof initArgs.isConnectionFromRemote).toBe("function");
      expect(screen.getByTestId("out").textContent).toBe("not-ready");

      await act(async () => {
        peer.emitOpen("master-peer-id");
      });

      await waitFor(() => {
        expect(screen.getByTestId("out").textContent).toBe(
          "master - off|on|sendAll|sendTo"
        );
      });
    });

    it("should disconnect the peer on unmount", async () => {
      const peer = makeFakePeer({ id: "master-peer-id" });
      const { unmount } = render(
        <WebRTCRemoteControlProvider mode="master" init={() => peer}>
          <Consumer />
        </WebRTCRemoteControlProvider>
      );

      unmount();

      expect(peer.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("remote mode", () => {
    it("should connect to the master and expose the resolved api", async () => {
      const peer = makeFakePeer({ id: "remote-peer-id" });

      render(
        <WebRTCRemoteControlProvider
          mode="remote"
          masterPeerId="master-peer-id"
          init={({ isConnectionFromRemote }) => {
            // the remote side has no use for the filter, so it is not handed one
            expect(isConnectionFromRemote).toBeUndefined();
            return peer;
          }}
        >
          <Consumer />
        </WebRTCRemoteControlProvider>
      );

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
          "remote master-peer-id off|on|send"
        );
      });
    });
  });

  describe("re-render", () => {
    // KNOWN QUIRK, pinned on purpose: `utils` is rebuilt on every render and sits in the
    // effect's dependency array, so any re-render tears the peer down and calls `init` again.
    it("should re-run `init` on every re-render", () => {
      const init = jest.fn(() => makeFakePeer());
      const { rerender } = render(
        <WebRTCRemoteControlProvider mode="master" init={init}>
          <Consumer />
        </WebRTCRemoteControlProvider>
      );

      expect(init).toHaveBeenCalledTimes(1);

      rerender(
        <WebRTCRemoteControlProvider mode="master" init={init}>
          <Consumer />
        </WebRTCRemoteControlProvider>
      );

      expect(init).toHaveBeenCalledTimes(2);
    });
  });
});
