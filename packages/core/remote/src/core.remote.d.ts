import EventEmitter from "eventemitter3";

import {
  HumanizeErrorType,
  GetPeerIdType,
  SetPeerIdToSessionStorageType,
} from "../../shared/common";

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
