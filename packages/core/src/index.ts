import type masterPrepare from "./master.js";
import type remotePrepare from "./remote.js";

export * as master from "./master.js";
export * as remote from "./remote.js";
export { prepareUtils } from "./common.js";

export type {
  HumanErrorsDefault,
  HumanErrorsMapping,
  HumanizableError,
  MakeHumanizeErrorOptions,
  PrepareUtilsOptions,
} from "./common.js";

export type MasterBindConnectionApiResolved = Awaited<
  ReturnType<ReturnType<typeof masterPrepare>["bindConnection"]>
>;
export type RemoteBindConnectionApiResolved = Awaited<
  ReturnType<ReturnType<typeof remotePrepare>["bindConnection"]>
>;
