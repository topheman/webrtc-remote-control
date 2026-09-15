import EventEmitter from "eventemitter3";
import type { DataConnection, Peer, PeerConnectOption } from "peerjs";
import type { Mock } from "vite-plus/test";
import { vi } from "vite-plus/test";

type ConsoleMethodName = "error" | "warn" | "log" | "info";

/* eslint-disable no-console */
export function disableConsole(
  mockFunction: (...args: unknown[]) => void = () => {},
  methodNames: ConsoleMethodName[] = ["error", "warn", "log", "info"],
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
/* eslint-enable no-console */

/**
 * A fake connection is a `DataConnection` as far as the library is concerned,
 * plus the `emit*` handles a test drives it with.
 */
export type FakeConnection = DataConnection & {
  send: Mock;
  disconnect: Mock;
  emitOpen: () => boolean;
  emitData: (data: unknown) => boolean;
  emitClose: () => boolean;
  emitError: (error: unknown) => boolean;
};

/** What the fake `peer.connect` is: peerjs's signature, narrowed to a fake connection. */
export type FakeConnectFn = (
  masterPeerId: string,
  options?: PeerConnectOption,
) => FakeConnection;

export type FakePeer = Peer & {
  connect: Mock<FakeConnectFn>;
  connections: FakeConnection[];
  /**
   * Typed as always returning a connection rather than `FakeConnection |
   * undefined`. Every caller here has just caused one to be created, and an
   * honest union would put a non-null assertion on roughly thirty call sites
   * to buy nothing - if the list is empty the test fails on the spot anyway.
   */
  lastConnection: () => FakeConnection;
  emitOpen: (peerId?: string) => boolean;
  emitConnection: (conn: FakeConnection) => boolean;
  emitError: (error: unknown) => boolean;
};

/**
 * Minimal stand-in for a peerjs `DataConnection`.
 *
 * The `emit*` methods are the test-facing side: they let a test play the role of
 * the remote end of the data channel. Everything else mirrors the peerjs surface
 * the library actually touches.
 */
export function makeFakeConnection(
  options: { peer?: string; metadata?: unknown } = {},
): FakeConnection {
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
    send: vi.fn<DataConnection["send"]>(),
    // peerjs's `DataConnection` has no `disconnect`; the fake keeps one because
    // the library's `beforeunload` handler still looks for it. See the note on
    // that handler in src/remote.ts.
    disconnect: vi.fn<() => void>(),
    emitOpen: () => ee.emit("open"),
    emitData: (data: unknown) => ee.emit("data", data),
    emitClose: () => ee.emit("close"),
    emitError: (error: unknown) => ee.emit("error", error),
  } as unknown as FakeConnection;
}

/**
 * Minimal stand-in for a peerjs `Peer`.
 *
 * `connect` records its arguments and hands back a fake connection, so remote-side
 * tests can assert on what the library asked peerjs for. Pass `connect` to override
 * that (for instance to throw, the way peerjs does once the peer is disconnected).
 */
export function makeFakePeer({
  id = "local-peer-id",
  connect,
}: {
  id?: string;
  connect?: (
    masterPeerId: string,
    options?: PeerConnectOption,
  ) => FakeConnection;
} = {}): FakePeer {
  const ee = new EventEmitter();
  const connections: FakeConnection[] = [];
  const peer = {
    id,
    on: ee.on.bind(ee),
    off: ee.off.bind(ee),
    disconnect: vi.fn<() => void>(),
    destroy: vi.fn<() => void>(),
    connect:
      connect ||
      vi.fn<
        (masterPeerId: string, options?: PeerConnectOption) => FakeConnection
      >((masterPeerId, options) => {
        const conn = makeFakeConnection({
          peer: id,
          metadata: options?.metadata,
        });
        connections.push(conn);
        return conn;
      }),
    // test-facing
    connections,
    lastConnection: () => connections[connections.length - 1],
    emitOpen: (peerId = id) => ee.emit("open", peerId),
    emitConnection: (conn: FakeConnection) => ee.emit("connection", conn),
    emitError: (error: unknown) => ee.emit("error", error),
  };
  return peer as unknown as FakePeer;
}
