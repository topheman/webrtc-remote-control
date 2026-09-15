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

export interface PrepareUtilsOptions {
  sessionStorageKey?: string;
  humanErrors?: MakeHumanizeErrorOptions;
}

export function makeStoreAccessor(
  sessionStorageKey = "webrtc-remote-control-peer-id",
) {
  return {
    getPeerId(): string | null {
      return sessionStorage.getItem(sessionStorageKey);
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

export function prepareUtils({
  sessionStorageKey,
  humanErrors,
}: PrepareUtilsOptions = {}) {
  const humanizeError = makeHumanizeError(humanErrors);
  const { isConnectionFromRemote } = makeConnectionFilterUtilities();
  const { getPeerId, setPeerIdToSessionStorage } =
    makeStoreAccessor(sessionStorageKey);
  return {
    humanizeError,
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
export type GetPeerIdType = ReturnType<typeof prepareUtils>["getPeerId"];
export type SetPeerIdToSessionStorageType = ReturnType<
  typeof prepareUtils
>["setPeerIdToSessionStorage"];
