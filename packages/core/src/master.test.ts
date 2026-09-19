import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import prepare, { prepareUtils } from "./master.js";
import type { PrepareMasterUtils } from "./master.js";
import {
  disableConsole,
  makeFakeConnection,
  makeFakePeer,
} from "../test.helpers.js";

/**
 * Behavioral baseline for the master side of the connection.
 *
 * These tests drive the real `prepare` against fake peerjs objects, so they describe
 * the contract the package ships today - not an idealized version of it.
 */
describe("master", () => {
  let restoreConsole: () => void;

  beforeEach(() => {
    restoreConsole = disableConsole();
  });
  afterEach(() => {
    restoreConsole();
    sessionStorage.clear();
  });

  function makeWrcMaster(utilsOverrides: Partial<PrepareMasterUtils> = {}) {
    const utils = { ...prepareUtils(), ...utilsOverrides };
    const peer = makeFakePeer({ id: "master-peer-id" });
    const promise = prepare(utils).bindConnection(peer);
    return { peer, promise, utils };
  }

  it("should re-export prepareUtils", () => {
    expect(typeof prepareUtils).toBe("function");
  });

  describe("bindConnection", () => {
    it("should not resolve until the peer emits `open`", async () => {
      const setPeerIdToSessionStorage = vi.fn<(peerId: string) => void>();
      const { peer, promise } = makeWrcMaster({ setPeerIdToSessionStorage });
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      await Promise.resolve();
      expect(resolved).toBe(false);
      expect(setPeerIdToSessionStorage).not.toHaveBeenCalled();

      peer.emitOpen("master-peer-id");
      await promise;

      expect(resolved).toBe(true);
      expect(setPeerIdToSessionStorage).toHaveBeenCalledWith("master-peer-id");
    });

    it("should write the peer id to sessionStorage through the default store accessor", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen("master-peer-id");
      await promise;

      expect(sessionStorage.getItem("webrtc-remote-control-peer-id")).toBe(
        "master-peer-id",
      );
    });

    it("should resolve to an api exposing sendTo, sendAll, on and off", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;

      expect(Object.keys(wrc).sort()).toEqual([
        "off",
        "on",
        "sendAll",
        "sendTo",
      ]);
    });
  });

  describe("connection filtering", () => {
    it("should ignore connections not issued by the remote", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onConnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.connect", onConnect);

      // a connection the user opened directly with `peer.connect`, without our metadata
      const foreign = makeFakeConnection({
        peer: "some-other-peer",
        metadata: undefined,
      });
      peer.emitConnection(foreign);
      foreign.emitOpen();
      foreign.emitData({ hello: "world" });

      expect(onConnect).not.toHaveBeenCalled();
      // it never entered the connections map either
      wrc.sendAll({ ping: true });
      expect(foreign.send).not.toHaveBeenCalled();
    });
  });

  describe("events", () => {
    it("should emit `remote.connect` with the remote id when the connection opens", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onConnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.connect", onConnect);

      const conn = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(conn);
      conn.emitOpen();

      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onConnect).toHaveBeenCalledWith({ id: "remote-1" });
    });

    it("should emit `data` with the sender metadata and the payload", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onData =
        vi.fn<
          (payload: { id: string; from: "remote" }, data: unknown) => void
        >();
      wrc.on("data", onData);

      const conn = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(conn);
      conn.emitOpen();
      conn.emitData({ type: "MOVE", payload: { x: 1 } });

      expect(onData).toHaveBeenCalledWith(
        { id: "remote-1", from: "remote" },
        { type: "MOVE", payload: { x: 1 } },
      );
    });

    it("should emit `remote.disconnect` on close and drop the connection", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onDisconnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.disconnect", onDisconnect);

      const conn = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(conn);
      conn.emitOpen();
      conn.emitClose();

      expect(onDisconnect).toHaveBeenCalledWith({ id: "remote-1" });
      // gone from the map: sendTo can no longer reach it
      expect(wrc.sendTo("remote-1", { ping: true })).toBe(null);
      expect(conn.send).not.toHaveBeenCalled();
    });

    it("should stop notifying a listener removed with `off`", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onConnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.connect", onConnect);
      wrc.off("remote.connect", onConnect);

      const conn = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(conn);
      conn.emitOpen();

      expect(onConnect).not.toHaveBeenCalled();
    });
  });

  describe("sendTo", () => {
    it("should send the payload to the matching connection", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;

      const conn = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(conn);
      conn.emitOpen();
      wrc.sendTo("remote-1", { ping: true });

      expect(conn.send).toHaveBeenCalledWith({ ping: true });
    });

    it("should return null for an unknown id, without throwing", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;

      expect(() => wrc.sendTo("nobody", { ping: true })).not.toThrow();
      expect(wrc.sendTo("nobody", { ping: true })).toBe(null);
    });
  });

  describe("sendAll", () => {
    it("should broadcast to every tracked connection", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;

      const connA = makeFakeConnection({ peer: "remote-a" });
      const connB = makeFakeConnection({ peer: "remote-b" });
      [connA, connB].forEach((conn) => {
        peer.emitConnection(conn);
        conn.emitOpen();
      });
      wrc.sendAll({ ping: true });

      expect(connA.send).toHaveBeenCalledWith({ ping: true });
      expect(connB.send).toHaveBeenCalledWith({ ping: true });
    });

    it("should not throw when there is no connection at all", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;

      expect(() => wrc.sendAll({ ping: true })).not.toThrow();
    });
  });

  describe("reconnection", () => {
    it("should replace a connection when the same peer id connects again", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;

      const first = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(first);
      first.emitOpen();

      const second = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(second);
      second.emitOpen();

      wrc.sendAll({ ping: true });

      expect(first.send).not.toHaveBeenCalled();
      expect(second.send).toHaveBeenCalledWith({ ping: true });
    });

    it("should close and disconnect a superseded connection as soon as its replacement arrives", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onDisconnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.disconnect", onDisconnect);

      const first = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(first);
      first.emitOpen();

      // The replacement connecting is what makes `first` stale - real peerjs
      // can take an indeterminate time to notice on its own, which is what
      // let a reconnecting remote go silently undelivered-to in production.
      const second = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(second);

      expect(first.close).toHaveBeenCalledTimes(1);
      expect(onDisconnect).toHaveBeenCalledWith({ id: "remote-1" });
    });

    it("should not let a superseded connection's belated close evict its replacement", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onDisconnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.disconnect", onDisconnect);

      const first = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(first);
      first.emitOpen();

      const second = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(second);
      second.emitOpen();
      onDisconnect.mockClear();

      // A second "close" on a connection the master already closed itself.
      // Real peerjs 1.5.5 only emits "close" once, and only for a connection
      // that was open, so this is a defensive guard rather than a path the
      // CI flake took - the fake emits on demand, which is what makes the
      // guard observable here.
      first.emitClose();

      expect(onDisconnect).not.toHaveBeenCalled();
      expect(wrc.sendTo("remote-1", { ping: true })).not.toBe(null);
      expect(second.send).toHaveBeenCalledWith({ ping: true });
    });

    it("should emit `remote.disconnect` for the old connection before `remote.connect` for its replacement", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const calls: string[] = [];
      wrc.on("remote.connect", () => calls.push("connect"));
      wrc.on("remote.disconnect", () => calls.push("disconnect"));

      const first = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(first);
      first.emitOpen();

      // The e2e reload scenario reads this order off the master's event log:
      // the drop is announced when the replacement arrives, the reconnect
      // when the replacement opens, never the other way round.
      const second = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(second);
      second.emitOpen();

      expect(calls).toEqual(["connect", "disconnect", "connect"]);
    });

    it("should announce a connection once even if peerjs fires `open` on it twice", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onConnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.connect", onConnect);

      const conn = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(conn);
      conn.emitOpen();
      conn.emitOpen();

      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it("should not announce a superseded connection that opens after its replacement arrived", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onConnect = vi.fn<(payload: { id: string }) => void>();
      const onDisconnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.connect", onConnect);
      wrc.on("remote.disconnect", onDisconnect);

      // Two connections for the same id arrive before either opens - what a
      // signaling server replaying queued offers to a master that just came
      // back can produce. Only the one the master kept may announce itself.
      const first = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(first);
      const second = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(second);
      first.emitOpen();
      second.emitOpen();

      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onDisconnect).not.toHaveBeenCalled();
      wrc.sendTo("remote-1", { ping: true });
      expect(first.send).not.toHaveBeenCalled();
      expect(second.send).toHaveBeenCalledWith({ ping: true });
    });

    it("should not emit `remote.disconnect` for a connection that never opened", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onDisconnect = vi.fn<(payload: { id: string }) => void>();
      wrc.on("remote.disconnect", onDisconnect);

      const conn = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(conn);
      conn.emitClose();

      expect(onDisconnect).not.toHaveBeenCalled();
      expect(wrc.sendTo("remote-1", { ping: true })).toBe(null);
    });
  });
});
