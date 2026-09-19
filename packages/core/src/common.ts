/**
 * The shape `humanizeError` accepts. peerjs errors carry a `type`, but the
 * function is deliberately tolerant: anything with an optional `type` and
 * `message` works, including a plain `Error`.
 */
export interface HumanizableError {
  type?: string;
  message?: string;
}

/**
 * A fallback entry may be a string or a function of the error. Only the
 * `default` key is ever called; every other key is a plain string.
 */
export type HumanErrorsDefault = string | ((error: HumanizableError) => string);

export interface HumanErrorsMapping {
  [errorType: string]: string | HumanErrorsDefault | undefined;
  default?: HumanErrorsDefault;
}

export interface MakeHumanizeErrorOptions {
  mapping?: HumanErrorsMapping;
  withTechicalErrorMessage?: boolean;
}

/**
 * What `remote.reconnecting` carries. Declared here rather than in `remote.ts`
 * so `makeReconnectNotice` can name it without the two modules importing each
 * other.
 */
export interface ReconnectingPayload {
  id: string;
  attempt: number;
  nextDelayMs: number;
}

/**
 * A notice may be a plain value or a function of the payload, the way the
 * `default` entry of the error mapping may be.
 */
export type ReconnectMessage<T> = T | ((payload: ReconnectingPayload) => T);

export interface MakeReconnectNoticeOptions<
  TReconnecting = string,
  TStalled = string,
> {
  /** Shown while recovery is still plausible. */
  reconnecting?: ReconnectMessage<TReconnecting>;
  /** Shown once the backoff has reached its ceiling. */
  stalled?: ReconnectMessage<TStalled>;
}

export interface PrepareUtilsOptions<
  TReconnecting = string,
  TStalled = string,
> {
  sessionStorageKey?: string;
  humanErrors?: MakeHumanizeErrorOptions;
  reconnectNotice?: MakeReconnectNoticeOptions<TReconnecting, TStalled>;
}

export function makeStoreAccessor(
  sessionStorageKey = "webrtc-remote-control-peer-id",
) {
  return {
    getPeerId(): string | undefined {
      return sessionStorage.getItem(sessionStorageKey) ?? undefined;
    },
    setPeerIdToSessionStorage(peerId: string): void {
      sessionStorage.setItem(sessionStorageKey, peerId);
    },
  };
}

export function makeConnectionFilterUtilities() {
  const connMetadata = "from-webrtc-remote-control";
  return {
    isConnectionFromRemote(conn: { metadata?: unknown }): boolean {
      return conn.metadata === connMetadata;
    },
    connMetadata,
  };
}

/**
 * Pass mapping of error.type / message
 * You can pass `default` key a function that accepts an `error` and returns a string
 */
export function makeHumanizeError(
  {
    mapping: overrideMapping,
    withTechicalErrorMessage,
  }: MakeHumanizeErrorOptions = {
    mapping: {},
    withTechicalErrorMessage: true,
  },
) {
  const builtinMapping = {
    "browser-incompatible":
      "Your browser doesn't support WebRTC features, please try with a recent browser.",
    disconnected:
      "You are disconnected and can't make any more peer connection, please reload.",
    network: "It seems you're experimenting some network problems.",
    "peer-unavailable":
      "The peer you were connected to seems to have lost connection, try to reload it.",
    "server-error":
      "An error occured on the signaling server. Sorry, try to come back later.",
    default: (error: HumanizableError) =>
      `An error occured${error.type ? ` - type: ${error.type}` : ""}`,
  };
  const mapping: HumanErrorsMapping = {
    ...builtinMapping,
    ...overrideMapping,
  };
  return function humanizeError(error: HumanizableError): string {
    const mapped = error.type === undefined ? undefined : mapping[error.type];
    // Only `default` is ever called; every other entry is a plain string. The
    // built-in default is the last resort so that the return type is `string`
    // rather than `string | undefined` - erasing `default` by passing it as
    // `undefined` used to make this return `undefined`, which no caller could
    // usefully do anything with.
    const fallback = mapping.default ?? builtinMapping.default;
    // `||` rather than `??`, because the pre-TypeScript implementation fell
    // through on an empty string too.
    const humanError =
      (typeof mapped === "string" ? mapped : undefined) ||
      (typeof fallback === "function" ? fallback(error) : fallback);
    return humanError && error.message && withTechicalErrorMessage
      ? `${humanError} (${error.message})`
      : humanError;
  };
}

/**
 * How long a reconnection attempt that has not opened is given before it is
 * abandoned, doubling each time up to the ceiling.
 *
 * These live here rather than in `remote.ts` because the retry loop is not the
 * only thing that needs them: deciding when "reconnecting" stops being a
 * plausible thing to tell a user means comparing against the ceiling, and that
 * comparison is the library's job rather than every consumer's.
 */
export const RECONNECT_FIRST_DELAY_MS = 1000;
export const RECONNECT_MAX_DELAY_MS = 8000;

export function reconnectDelay(attempt: number): number {
  return Math.min(
    RECONNECT_FIRST_DELAY_MS * 2 ** attempt,
    RECONNECT_MAX_DELAY_MS,
  );
}

const builtinReconnectNotice = {
  reconnecting: "Lost connection to the peer, reconnecting...",
  stalled: ({ attempt }: ReconnectingPayload) =>
    `Still no answer after ${attempt} attempts. The peer may be gone for good - try reloading.`,
};

function resolveReconnectMessage<T>(
  message: ReconnectMessage<T>,
  payload: ReconnectingPayload,
): T {
  return typeof message === "function"
    ? (message as (payload: ReconnectingPayload) => T)(payload)
    : message;
}

/**
 * Builds the function that turns a `remote.reconnecting` payload into
 * something to show, choosing between "still trying" and "probably gone".
 *
 * That choice is the point of it. It is made by comparing `nextDelayMs`
 * against the backoff ceiling, and a consumer should not have to know that
 * number - or notice when it changes - to tell a user whether waiting is still
 * worth it.
 *
 * Both messages are overridable, and both may be a value or a function of the
 * payload. The type parameters are inferred from whatever is passed, so
 * returning something richer than a string - a React node, say - needs no
 * annotation at the call site and no cast.
 */
export function makeReconnectNotice<TReconnecting = string, TStalled = string>({
  reconnecting,
  stalled,
}: MakeReconnectNoticeOptions<TReconnecting, TStalled> = {}) {
  return function reconnectNotice(
    payload: ReconnectingPayload,
  ): TReconnecting | TStalled {
    if (payload.nextDelayMs >= RECONNECT_MAX_DELAY_MS) {
      return stalled === undefined
        ? // Only reachable while `TStalled` is its `string` default: supplying a
          // different one means supplying the message that produces it.
          (builtinReconnectNotice.stalled(payload) as TStalled)
        : resolveReconnectMessage(stalled, payload);
    }
    return reconnecting === undefined
      ? (builtinReconnectNotice.reconnecting as TReconnecting)
      : resolveReconnectMessage(reconnecting, payload);
  };
}

export function prepareUtils<TReconnecting = string, TStalled = string>({
  sessionStorageKey,
  humanErrors,
  reconnectNotice: reconnectNoticeOptions,
}: PrepareUtilsOptions<TReconnecting, TStalled> = {}) {
  const humanizeError = makeHumanizeError(humanErrors);
  const reconnectNotice = makeReconnectNotice(reconnectNoticeOptions);
  const { isConnectionFromRemote } = makeConnectionFilterUtilities();
  const { getPeerId, setPeerIdToSessionStorage } =
    makeStoreAccessor(sessionStorageKey);
  return {
    humanizeError,
    reconnectNotice,
    isConnectionFromRemote,
    getPeerId,
    setPeerIdToSessionStorage,
  };
}

export type HumanizeErrorType = ReturnType<
  typeof prepareUtils
>["humanizeError"];
export type IsConnectionFromRemoteType = ReturnType<
  typeof prepareUtils
>["isConnectionFromRemote"];
export type ReconnectNoticeType = ReturnType<
  typeof prepareUtils
>["reconnectNotice"];
export type GetPeerIdType = ReturnType<typeof prepareUtils>["getPeerId"];
export type SetPeerIdToSessionStorageType = ReturnType<
  typeof prepareUtils
>["setPeerIdToSessionStorage"];
