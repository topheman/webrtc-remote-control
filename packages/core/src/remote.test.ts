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
    // KNOWN DEFECT, pinned here on purpose: this passes only because the fake
    // connection has a `disconnect` method. A real peerjs `DataConnection` has
    // `close`, not `disconnect`, so against real peerjs the handler does
    // nothing. See the matching note in src/remote.ts.
    it("should disconnect the connection when the page goes away", async () => {
      const { peer } = await connect();
      const conn: FakeConnection = peer.lastConnection();

      window.dispatchEvent(new window.Event("beforeunload"));

      expect(conn.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
