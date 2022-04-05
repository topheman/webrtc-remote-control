export function makeStoreAccessor(sessionStorageKey?: string): {
  getPeerId(): string;
  setPeerIdToSessionStorage(peerId: string): void;
};

export function makeConnectionFilterUtilities(): {
  isConnectionFromRemote(conn): boolean;
  connMetadata: string;
};

type HumanErrorsMapping = Record<string, string> & {
  default: (error: { type: string }) => string;
};

export function makeHumanizeError(options?: {
  mapping?: HumanErrorsMapping;
  withTechicalErrorMessage?: boolean;
}): (error: { type: string }) => string;

export function prepareUtils({
  sessionStorageKey,
  humanErrors,
}?: {
  sessionStorageKey: string;
  humanErrors: HumanErrorsMapping;
}): {
  humanizeError: ReturnType<typeof makeHumanizeError>;
  isConnectionFromRemote: ReturnType<
    typeof makeConnectionFilterUtilities
  >["isConnectionFromRemote"];
  getPeerId: ReturnType<typeof makeStoreAccessor>["getPeerId"];
  setPeerIdToSessionStorage: ReturnType<
    typeof makeStoreAccessor
  >["setPeerIdToSessionStorage"];
};

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
