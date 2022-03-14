export * as master from "../master/src/core.master";
export * as remote from "../remote/src/core.remote";
export * from "../shared/common";

import { default as MasterDefault } from "../master/src/core.master";
import { default as RemoteDefault } from "../remote/src/core.remote";

export type MasterBindConnectionApiResolved = Awaited<
  ReturnType<ReturnType<typeof MasterDefault>["bindConnection"]>
>;
export type RemoteBindConnectionApiResolved = Awaited<
  ReturnType<ReturnType<typeof RemoteDefault>["bindConnection"]>
>;
