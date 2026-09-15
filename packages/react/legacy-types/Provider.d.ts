import React from "react";

import {
  HumanErrorsMapping,
  HumanizeErrorType,
  GetPeerIdType,
  IsConnectionFromRemoteType,
} from "@webrtc-remote-control/core";

export function Provider({
  children,
  sessionStorageKey,
  humanErrors,
  mode,
  masterPeerId,
  init,
}: {
  children: React.ReactNode;
  sessionStorageKey?: string;
  humanErrors?: Partial<HumanErrorsMapping>;
  mode: "remote" | "master";
  masterPeerId?: string;
  init: ({
    humanizeError,
    getPeerId,
    isConnectionFromRemote,
  }: {
    humanizeError: HumanizeErrorType;
    getPeerId: GetPeerIdType;
    isConnectionFromRemote?: IsConnectionFromRemoteType;
  }) => any;
}): React.ReactElement | null;
