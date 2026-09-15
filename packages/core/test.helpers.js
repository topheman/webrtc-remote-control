import { vi } from "vite-plus/test";
import EventEmitter from "eventemitter3";

/* eslint-disable no-console */
export function disableConsole(
  mockFunction = () => {},
  methodNames = ["error", "warn", "log", "info"],
) {
  const originalConsoleMethods = methodNames.map((methodName) => ({
    methodName,
    method: console[methodName],
  }));
  methodNames.forEach((methodName) => {
    console[methodName] = mockFunction;
  });
  return function restoreConsole() {
    originalConsoleMethods.forEach(({ methodName, method }) => {
      console[methodName] = method;
    });
  };
}

/**
 * Minimal stand-in for a peerjs `DataConnection`.
 *
 * The `emit*` methods are the test-facing side: they let a test play the role of
 * the remote end of the data channel. Everything else mirrors the peerjs surface
 * the library actually touches.
 */
export function makeFakeConnection(options = {}) {
  const { peer = "remote-peer-id" } = options;
  // `metadata` is deliberately not a destructuring default: a connection the user
  // opened themselves has `metadata === undefined`, and a test must be able to say so.
  const metadata = Object.prototype.hasOwnProperty.call(options, "metadata")
    ? options.metadata
    : "from-webrtc-remote-control";
  const ee = new EventEmitter();
  return {
    peer,
    metadata,
    on: ee.on.bind(ee),
    off: ee.off.bind(ee),
    send: vi.fn(),
    disconnect: vi.fn(),
    emitOpen: () => ee.emit("open"),
    emitData: (data) => ee.emit("data", data),
    emitClose: () => ee.emit("close"),
    emitError: (error) => ee.emit("error", error),
  };
}

/**
 * Minimal stand-in for a peerjs `Peer`.
 *
 * `connect` records its arguments and hands back a fake connection, so remote-side
 * tests can assert on what the library asked peerjs for. Pass `connect` to override
 * that (for instance to throw, the way peerjs does once the peer is disconnected).
 */
export function makeFakePeer({ id = "local-peer-id", connect } = {}) {
  const ee = new EventEmitter();
  const connections = [];
  const peer = {
    id,
    on: ee.on.bind(ee),
    off: ee.off.bind(ee),
    disconnect: vi.fn(),
    destroy: vi.fn(),
    connect:
      connect ||
      vi.fn((masterPeerId, options) => {
        const conn = makeFakeConnection({
          peer: id,
          metadata: options.metadata,
        });
        connections.push(conn);
        return conn;
      }),
    // test-facing
    connections,
    lastConnection: () => connections[connections.length - 1],
    emitOpen: (peerId = id) => ee.emit("open", peerId),
    emitConnection: (conn) => ee.emit("connection", conn),
    emitError: (error) => ee.emit("error", error),
  };
  return peer;
}
