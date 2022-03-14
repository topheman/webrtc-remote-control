import EventEmitter from "eventemitter3";

import { prepareUtils } from "../../shared/common";

type HumanizeErrorType = ReturnType<typeof prepareUtils>["humanizeError"];
type GetPeerIdType = ReturnType<typeof prepareUtils>["getPeerId"];
type SetPeerIdToSessionStorageType = ReturnType<
  typeof prepareUtils
>["setPeerIdToSessionStorage"];

export default function ({
  humanizeError,
  getPeerId,
  setPeerIdToSessionStorage,
}: {
  humanizeError: HumanizeErrorType;
  getPeerId: GetPeerIdType;
  setPeerIdToSessionStorage: SetPeerIdToSessionStorageType;
}): {
  humanizeError: HumanizeErrorType;
  getPeerId: GetPeerIdType;
  bindConnection(peer: any): Promise<{
    send(payload: any): any;
    on: InstanceType<typeof EventEmitter>["on"];
    off: InstanceType<typeof EventEmitter>["off"];
  }>;
};
