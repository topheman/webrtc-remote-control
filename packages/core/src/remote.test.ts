import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import prepare, { prepareUtils } from "./remote.js";
import type { PrepareRemoteUtils } from "./remote.js";
import { disableConsole, makeFakePeer } from "../test.helpers.js";
import type { FakeConnection, FakeConnectFn } from "../test.helpers.js";

/**
 * Behavioral baseline for the remote side of the connection.
 *
 * The remote is the side that owns reconnection, so most of what is pinned down here
 * is the close/reconnect cycle and the exact options handed to `peer.connect`.
 */
describe("remote", () => {
  let restoreConsole: () => void;

  beforeEach(() => {
    restoreConsole = disableConsole();
  });
  afterEach(() => {
    restoreConsole();
    sessionStorage.clear();
    // Only the reconnection tests install fake timers, but leaving them on
    // would silently freeze every test that runs after one of them.
    vi.useRealTimers();
  });

  interface MakeWrcRemoteOptions {
    utilsOverrides?: Partial<PrepareRemoteUtils>;
    peerOverrides?: { id?: string };
  }

  function makeWrcRemote({
    utilsOverrides = {},
    peerOverrides = {},
  }: MakeWrcRemoteOptions = {}) {
    const utils = { ...prepareUtils(), ...utilsOverrides };
    const peer = makeFakePeer({ id: "remote-peer-id", ...peerOverrides });
    const promise = prepare(utils).bindConnection(peer, "master-peer-id");
    return { peer, promise };
  }

  /** Drives the handshake up to a resolved api: peer opens, then the connection opens. */
  async function connect(options?: MakeWrcRemoteOptions) {
    const { peer, promise } = makeWrcRemote(options);
    peer.emitOpen();
    peer.lastConnection().emitOpen();
    const wrc = await promise;
    return { peer, wrc };
  }

  it("should re-export prepareUtils", () => {
    expect(typeof prepareUtils).toBe("function");
  });

  describe("reconnectNotice", () => {
    it("should hand back the one it was given", () => {
      const { reconnectNotice } = prepare(
        prepareUtils({ reconnectNotice: { reconnecting: "hold on" } }),
      );

      expect(
        reconnectNotice({
          id: "master-peer-id",
          attempt: 1,
          nextDelayMs: 1000,
        }),
      ).toBe("hold on");
    });

    it("should build a default one when the bundle it was handed has none", () => {
      // `prepare` is public, so a caller may hand in a bundle of their own
      // rather than the one `prepareUtils` builds. The remote side is the one
      // that reconnects, so it always has a notice to offer.
      const { reconnectNotice } = prepare({
        humanizeError: () => "",
        getPeerId: () => undefined,
        setPeerIdToSessionStorage: () => undefined,
      });

      expect(
        reconnectNotice({
          id: "master-peer-id",
          attempt: 1,
          nextDelayMs: 1000,
        }),
      ).toBe("Lost connection to the peer, reconnecting...");
    });
  });

  describe("bindConnection", () => {
    it("should connect to the master with json serialization and the package metadata", async () => {
      const { peer } = await connect();

      expect(peer.connect).toHaveBeenCalledTimes(1);
      expect(peer.connect).toHaveBeenCalledWith("master-peer-id", {
        serialization: "json",
        metadata: "from-webrtc-remote-control",
      });
    });

    it("should not resolve until the connection opens", async () => {
      const { peer, promise } = makeWrcRemote();
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      peer.emitOpen();
      await Promise.resolve();
      expect(resolved).toBe(false);

      peer.lastConnection().emitOpen();
      await promise;
      expect(resolved).toBe(true);
    });

    it("should write the peer id to sessionStorage when the peer opens", async () => {
      const setPeerIdToSessionStorage = vi.fn<(peerId: string) => void>();
      const { peer } = makeWrcRemote({
        utilsOverrides: { setPeerIdToSessionStorage },
      });

      peer.emitOpen("remote-peer-id");

      expect(setPeerIdToSessionStorage).toHaveBeenCalledWith("remote-peer-id");
      expect(peer.connect).toHaveBeenCalledTimes(1);
    });

    it("should resolve to an api exposing send, on and off", async () => {
      const { wrc } = await connect();

      expect(Object.keys(wrc).sort()).toEqual(["off", "on", "send"]);
    });
  });

  describe("data", () => {
    it("should emit `data` tagged as coming from the master", async () => {
      const { peer, wrc } = await connect();
      const onData =
        vi.fn<(payload: { from: "master" }, data: unknown) => void>();
      wrc.on("data", onData);

      peer.lastConnection().emitData({ type: "PING" });

      expect(onData).toHaveBeenCalledWith({ from: "master" }, { type: "PING" });
    });

    it("should stop notifying a listener removed with `off`", async () => {
      const { peer, wrc } = await connect();
      const onData =
        vi.fn<(payload: { from: "master" }, data: unknown) => void>();
      wrc.on("data", onData);
      wrc.off("data", onData);

      peer.lastConnection().emitData({ type: "PING" });

      expect(onData).not.toHaveBeenCalled();
    });
  });

  describe("send", () => {
    it("should forward the payload to the current connection", async () => {
      const { peer, wrc } = await connect();

      wrc.send({ type: "MOVE" });

      expect(peer.lastConnection().send).toHaveBeenCalledWith({ type: "MOVE" });
    });

    it("should send through the new connection after a reconnect", async () => {
      const { peer, wrc } = await connect();
      const first = peer.lastConnection();
      first.emitClose();
      const second = peer.lastConnection();
      second.emitOpen();

      wrc.send({ type: "MOVE" });

      expect(second).not.toBe(first);
      expect(first.send).not.toHaveBeenCalled();
      expect(second.send).toHaveBeenCalledWith({ type: "MOVE" });
    });

    it("should take the no-connection branch when reconnecting failed", async () => {
      // `peer.connect` throws once the peer lost the signaling server, which is how the
      // connection can end up null: the close handler nulls it, then the rebuild throws.
      let attempts = 0;
      const peer = makeFakePeer({ id: "remote-peer-id" });
      const realConnect: FakeConnectFn = peer.connect;
      peer.connect = vi.fn<FakeConnectFn>((masterPeerId, options) => {
        attempts += 1;
        if (attempts > 1) {
          throw new Error(
            "Cannot connect to new Peer after disconnecting from server.",
          );
        }
        return realConnect(masterPeerId, options);
      });
      const promise = prepare(prepareUtils()).bindConnection(
        peer,
        "master-peer-id",
      );
      peer.emitOpen();
      peer.lastConnection().emitOpen();
      const wrc = await promise;

      expect(() => peer.lastConnection().emitClose()).toThrow(
        "Cannot connect to new Peer after disconnecting from server.",
      );

      // Sending with no connection is a caller mistake and throws. Before the
      // TypeScript port it threw by accident, from a call to the non-existent
      // `console.warning`; now it throws deliberately, with a message.
      expect(() => wrc.send({ type: "MOVE" })).toThrow(
        "webrtc-remote-control: `send` was called before a connection was established",
      );
    });
  });

  describe("reconnection", () => {
    it("should emit `remote.disconnect` then `remote.reconnect` across a close", async () => {
      const { peer, wrc } = await connect();
      const events: [string, { id: string }][] = [];
      wrc.on("remote.disconnect", (payload) =>
        events.push(["remote.disconnect", payload]),
      );
      wrc.on("remote.reconnect", (payload) =>
        events.push(["remote.reconnect", payload]),
      );

      peer.lastConnection().emitClose();
      expect(events).toEqual([["remote.disconnect", { id: "remote-peer-id" }]]);
      expect(peer.connect).toHaveBeenCalledTimes(2);

      peer.lastConnection().emitOpen();
      expect(events).toEqual([
        ["remote.disconnect", { id: "remote-peer-id" }],
        ["remote.reconnect", { id: "remote-peer-id" }],
      ]);
    });

    it("should keep retrying while the master stays unreachable, waiting longer each time", async () => {
      // The production failure this pins: reload the master and its peer id is
      // unregistered for a moment. The remote's reconnection attempt lands in
      // that window, and peerjs answers `peer-unavailable` on the *peer* - the
      // connection it handed back never opens and never closes, so a retry
      // loop driven by "close" alone stops here and the remote stays dead until
      // the user reloads it. Attempts are therefore abandoned on a deadline.
      vi.useFakeTimers();
      const { peer, wrc } = await connect();
      const onReconnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.reconnect", onReconnect);

      peer.lastConnection().emitClose();

      // The first retry is immediate, which is what it has always been.
      expect(peer.connect).toHaveBeenCalledTimes(2);

      // None of these attempts open. Each is dropped once its deadline passes
      // and the next one waits twice as long: 1s, 2s, 4s, then the 8s cap.
      await vi.advanceTimersByTimeAsync(999);
      expect(peer.connect).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(peer.connect).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(2000);
      expect(peer.connect).toHaveBeenCalledTimes(4);
      await vi.advanceTimersByTimeAsync(4000);
      expect(peer.connect).toHaveBeenCalledTimes(5);
      await vi.advanceTimersByTimeAsync(8000);
      expect(peer.connect).toHaveBeenCalledTimes(6);
      await vi.advanceTimersByTimeAsync(8000);
      expect(peer.connect).toHaveBeenCalledTimes(7);

      // The whole outage is one disconnection, not one per attempt.
      expect(onReconnect).not.toHaveBeenCalled();

      // The master comes back and the attempt in flight opens.
      peer.lastConnection().emitOpen();
      expect(onReconnect).toHaveBeenCalledTimes(1);

      // Once connected, the loop is idle: no attempt is abandoned under it.
      await vi.advanceTimersByTimeAsync(60000);
      expect(peer.connect).toHaveBeenCalledTimes(7);
    });

    it("should emit `remote.disconnect` once for an outage, not once per attempt", async () => {
      vi.useFakeTimers();
      const { peer, wrc } = await connect();
      const onDisconnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.disconnect", onDisconnect);

      peer.lastConnection().emitClose();
      await vi.advanceTimersByTimeAsync(30000);

      expect(peer.connect.mock.calls.length).toBeGreaterThan(2);
      expect(onDisconnect).toHaveBeenCalledTimes(1);
    });

    it("should start the backoff from the beginning at each new outage", async () => {
      vi.useFakeTimers();
      const { peer } = await connect();

      peer.lastConnection().emitClose();
      await vi.advanceTimersByTimeAsync(1000);
      expect(peer.connect).toHaveBeenCalledTimes(3);
      peer.lastConnection().emitOpen();

      // A later outage waits 1s again rather than resuming at the 2s step.
      peer.lastConnection().emitClose();
      expect(peer.connect).toHaveBeenCalledTimes(4);
      await vi.advanceTimersByTimeAsync(1000);
      expect(peer.connect).toHaveBeenCalledTimes(5);
    });

    it("should send through the connection that finally opened", async () => {
      vi.useFakeTimers();
      const { peer, wrc } = await connect();

      peer.lastConnection().emitClose();
      await vi.advanceTimersByTimeAsync(3000);
      const opened = peer.lastConnection();
      opened.emitOpen();

      wrc.send({ type: "MOVE" });

      expect(opened.send).toHaveBeenCalledWith({ type: "MOVE" });
      peer.connections
        .filter((conn) => conn !== opened)
        .forEach((conn) => expect(conn.send).not.toHaveBeenCalled());
    });

    it("should announce every attempt, with a delay that grows then holds at the cap", async () => {
      vi.useFakeTimers();
      const { peer, wrc } = await connect();
      const attempts: { id: string; attempt: number; nextDelayMs: number }[] =
        [];
      wrc.on("remote.reconnecting", (payload) => attempts.push(payload));

      peer.lastConnection().emitClose();
      await vi.advanceTimersByTimeAsync(30000);

      // The first entry lands with the immediate retry, so an application has
      // something to show straight away rather than after the first second.
      expect(attempts.slice(0, 5)).toEqual([
        { id: "remote-peer-id", attempt: 1, nextDelayMs: 1000 },
        { id: "remote-peer-id", attempt: 2, nextDelayMs: 2000 },
        { id: "remote-peer-id", attempt: 3, nextDelayMs: 4000 },
        { id: "remote-peer-id", attempt: 4, nextDelayMs: 8000 },
        { id: "remote-peer-id", attempt: 5, nextDelayMs: 8000 },
      ]);
    });

    it("should not announce a reconnection for the first connection", async () => {
      // The first connection is not retried: `peer-unavailable` there means the
      // master id is wrong or gone, and "try reloading" is the honest advice.
      const { peer, promise } = makeWrcRemote();
      const onReconnecting =
        vi.fn<
          (payload: {
            id: string;
            attempt: number;
            nextDelayMs: number;
          }) => void
        >();
      peer.emitOpen();
      peer.lastConnection().emitOpen();
      const wrc = await promise;
      wrc.on("remote.reconnecting", onReconnecting);

      expect(onReconnecting).not.toHaveBeenCalled();
    });

    it("should count attempts from one again after a successful reconnection", async () => {
      vi.useFakeTimers();
      const { peer, wrc } = await connect();
      const attempts: number[] = [];
      wrc.on("remote.reconnecting", ({ attempt }) => attempts.push(attempt));

      peer.lastConnection().emitClose();
      await vi.advanceTimersByTimeAsync(1000);
      peer.lastConnection().emitOpen();
      peer.lastConnection().emitClose();

      expect(attempts).toEqual([1, 2, 1]);
    });

    it("should keep reconnecting on every subsequent close", async () => {
      const { peer, wrc } = await connect();
      const onReconnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.reconnect", onReconnect);

      peer.lastConnection().emitClose();
      peer.lastConnection().emitOpen();
      peer.lastConnection().emitClose();
      peer.lastConnection().emitOpen();

      expect(peer.connect).toHaveBeenCalledTimes(3);
      expect(onReconnect).toHaveBeenCalledTimes(2);
    });
  });

  describe("beforeunload", () => {
    it("should close the connection when the page goes away", async () => {
      const { peer } = await connect();
      const conn: FakeConnection = peer.lastConnection();

      window.dispatchEvent(new window.Event("beforeunload"));

      expect(conn.close).toHaveBeenCalledTimes(1);
    });

    // The close a page teardown causes is not an outage: reconnecting from it
    // would open a connection the master has to clean up again moments later,
    // on a page that is going away regardless.
    it("should not reconnect after closing on unload", async () => {
      const { peer, wrc } = await connect();
      const onReconnecting = vi.fn<() => void>();
      wrc.on("remote.reconnecting", onReconnecting);

      window.dispatchEvent(new window.Event("beforeunload"));

      expect(onReconnecting).not.toHaveBeenCalled();
      expect(peer.connect).toHaveBeenCalledTimes(1);
    });
  });
});
