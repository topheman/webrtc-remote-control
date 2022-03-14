import EventEmitter from "eventemitter3";

import {
  HumanizeErrorType,
  IsConnectionFromRemoteType,
  GetPeerIdType,
  SetPeerIdToSessionStorageType,
} from "../../shared/common";

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
