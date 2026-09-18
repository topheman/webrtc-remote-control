import type masterPrepare from "./master.js";
import type remotePrepare from "./remote.js";

export * as master from "./master.js";
export * as remote from "./remote.js";
export { makeReconnectNotice, prepareUtils } from "./common.js";

// The pre-TypeScript `index.d.ts` declared all of these, because it re-exported
// the whole of `common`. The four `*Type` aliases - the types of the utilities
// `prepareUtils` hands out - are named by the react and vue bindings in their
// own public declarations, so the generated root export has to keep offering
// them.
export type {
  GetPeerIdType,
  HumanErrorsDefault,
  HumanErrorsMapping,
  HumanizableError,
  HumanizeErrorType,
  IsConnectionFromRemoteType,
  MakeHumanizeErrorOptions,
  MakeReconnectNoticeOptions,
  PrepareUtilsOptions,
  ReconnectingPayload,
  ReconnectMessage,
  ReconnectNoticeType,
  SetPeerIdToSessionStorageType,
} from "./common.js";

export type MasterBindConnectionApiResolved = Awaited<
  ReturnType<ReturnType<typeof masterPrepare>["bindConnection"]>
>;
export type RemoteBindConnectionApiResolved = Awaited<
  ReturnType<ReturnType<typeof remotePrepare>["bindConnection"]>
>;
