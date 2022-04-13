import { ToRefs, UnwrapNestedRefs } from "vue";

import {
  MasterBindConnectionApiResolved,
  RemoteBindConnectionApiResolved,
  HumanizeErrorType,
  IsConnectionFromRemoteType,
} from "@webrtc-remote-control/core";

export function usePeer<M extends "remote" | "master">(): ToRefs<
  UnwrapNestedRefs<{
    peerReady: boolean;
    ready: boolean;
    api?: M extends "remote"
      ? RemoteBindConnectionApiResolved
      : MasterBindConnectionApiResolved;
    peer: any;
    mode: "remote" | "master";
    humanizeError: HumanizeErrorType;
    isConnectionFromRemote: M extends "master"
      ? IsConnectionFromRemoteType
      : undefined;
  }>
>;
