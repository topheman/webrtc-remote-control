/* eslint-disable import/no-relative-packages */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prepare, { prepareUtils } from "./core.master";
import {
  disableConsole,
  makeFakeConnection,
  makeFakePeer,
} from "../../test.helpers";

/**
 * Behavioral baseline for the master side of the connection.
 *
 * These tests drive the real `prepare` against fake peerjs objects, so they describe
 * the contract the package ships today - not an idealized version of it.
 */
describe("master/core.master", () => {
  let restoreConsole = null;

  beforeEach(() => {
    restoreConsole = disableConsole();
  });
  afterEach(() => {
    restoreConsole();
    sessionStorage.clear();
  });

  function makeWrcMaster(utilsOverrides = {}) {
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
      const setPeerIdToSessionStorage = vi.fn();
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
        "master-peer-id"
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
      const onConnect = vi.fn();
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
      const onConnect = vi.fn();
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
      const onData = vi.fn();
      wrc.on("data", onData);

      const conn = makeFakeConnection({ peer: "remote-1" });
      peer.emitConnection(conn);
      conn.emitOpen();
      conn.emitData({ type: "MOVE", payload: { x: 1 } });

      expect(onData).toHaveBeenCalledWith(
        { id: "remote-1", from: "remote" },
        { type: "MOVE", payload: { x: 1 } }
      );
    });

    it("should emit `remote.disconnect` on close and drop the connection", async () => {
      const { peer, promise } = makeWrcMaster();
      peer.emitOpen();
      const wrc = await promise;
      const onDisconnect = vi.fn();
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
      const onConnect = vi.fn();
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
  });
});
