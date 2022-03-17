// eslint-disable-next-line import/no-extraneous-dependencies
import { shallowRef, watchEffect, provide } from "vue";
import { master, remote, prepareUtils } from "@webrtc-remote-control/core";

// use Symbol to avoid collision in provide/inject
export const MyContext = Symbol("context-webrtc-remote-control");

export function provideWebTCRemoteControl(
  init,
  mode,
  { masterPeerId, sessionStorageKey, humanErrors } = {}
) {
  const allowedMode = ["master", "remote"];
  if (!allowedMode.includes(mode)) {
    throw new Error(
      `Unsupported "${mode}" mode. Only ${allowedMode
        .map((a) => `"${a}"`)
        .join(", ")} accepted.`
    );
  }
  if (mode === "master" && masterPeerId) {
    console.log(typeof masterPeerId);
    throw new Error(
      `\`masterPeerId\` prop not allowed in "master" mode - "${masterPeerId}" was passed.`
    );
  }
  if (mode === "remote" && !masterPeerId) {
    throw new Error(`\`masterPeerId\` prop required in "remote" mode.`);
  }
  const utils = prepareUtils({
    sessionStorageKey,
    humanErrors,
  });
  const providerValue = shallowRef({
    peer: null,
    promise: null,
    mode,
    masterPeerId,
  });
  // expose providerValue so that it can be injected inside the hook
  provide(MyContext, providerValue);

  watchEffect((onCleanup) => {
    console.log("Provider.watch");
    providerValue.value.mode = mode;
    providerValue.value.humanizeError = utils.humanizeError;
    if (mode === "master") {
      providerValue.value.isConnectionFromRemote = utils.isConnectionFromRemote;
    }

    // init callback that should return a peer instance like:
    // `({ getPeerId }) => new Peer(getPeerId())`
    providerValue.value.peer = init({
      humanizeError: utils.humanizeError,
      getPeerId: utils.getPeerId,
      isConnectionFromRemote:
        mode === "master" ? utils.isConnectionFromRemote : undefined,
    });

    providerValue.value.promise = (mode === "master" ? master : remote)
      .default(utils)
      .bindConnection(
        providerValue.value.peer,
        remote ? masterPeerId : undefined
      );
    // start resolving the promise as soon as possible (it will be used in `usePeer`)
    providerValue.value.promise.then((wrcApi) => {
      console.log("Provider.then", wrcApi);
    });
    // register cleanup
    onCleanup(() => {
      console.log("Provider.onInvalidate", providerValue.value);
      if (providerValue.value) {
        providerValue.value.peer.disconnect();
      }
    });
  });
}
