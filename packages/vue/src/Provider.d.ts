import {
  HumanErrorsMapping,
  HumanizeErrorType,
  GetPeerIdType,
  IsConnectionFromRemoteType,
} from "@webrtc-remote-control/core";

export function provideWebTCRemoteControl(
  init: ({
    humanizeError,
    getPeerId,
    isConnectionFromRemote,
  }: {
    humanizeError: HumanizeErrorType;
    getPeerId: GetPeerIdType;
    isConnectionFromRemote?: IsConnectionFromRemoteType;
  }) => any,
  mode: "remote" | "master",
  options?: {
    masterPeerId?: string;
    sessionStorageKey?: string;
    humanErrors?: Partial<HumanErrorsMapping>;
  }
): void;
