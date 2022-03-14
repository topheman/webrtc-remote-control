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

export function makeHumanizeError(
  overrideMapping?: HumanErrorsMapping
): (error: { type: string }) => string;

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
