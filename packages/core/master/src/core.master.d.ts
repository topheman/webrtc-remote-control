import EventEmitter from "eventemitter3";

import { prepareUtils } from "../../shared/common";

type HumanizeErrorType = ReturnType<typeof prepareUtils>["humanizeError"];
type GetPeerIdType = ReturnType<typeof prepareUtils>["getPeerId"];
type IsConnectionFromRemoteType = ReturnType<
  typeof prepareUtils
>["isConnectionFromRemote"];
type SetPeerIdToSessionStorageType = ReturnType<
  typeof prepareUtils
>["setPeerIdToSessionStorage"];

export default function ({
  humanizeError,
  isConnectionFromRemote,
  getPeerId,
  setPeerIdToSessionStorage,
}: {
  humanizeError: HumanizeErrorType;
  isConnectionFromRemote: IsConnectionFromRemoteType;
  getPeerId: GetPeerIdType;
  setPeerIdToSessionStorage: SetPeerIdToSessionStorageType;
}): {
  humanizeError: HumanizeErrorType;
  getPeerId: GetPeerIdType;
  bindConnection(peer: any): Promise<{
    sendTo(id: string, payload: any): any;
    sendAll(payload: any): any;
    on: InstanceType<typeof EventEmitter>["on"];
    off: InstanceType<typeof EventEmitter>["off"];
  }>;
};
