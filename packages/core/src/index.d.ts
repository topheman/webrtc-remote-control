export * as master from "./master.js";
export * as remote from "./remote.js";
export * from "./common.js";

import { default as MasterDefault } from "./master.js";
import { default as RemoteDefault } from "./remote.js";

export type MasterBindConnectionApiResolved = Awaited<
  ReturnType<ReturnType<typeof MasterDefault>["bindConnection"]>
>;
export type RemoteBindConnectionApiResolved = Awaited<
  ReturnType<ReturnType<typeof RemoteDefault>["bindConnection"]>
>;
