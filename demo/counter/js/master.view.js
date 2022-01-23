import { makeRemotePeerUrl } from "./common";

import "./components/console-display";
// import "./components/counter-display";
import "./components/errors-display";
import "./components/footer-display";
import "./components/qrcode-display";
import "./components/remotes-list";
// import "./components/twitter-button";

export function createView(templateNode, staticContent) {
  const content = document.createElement("div");
  content.appendChild(templateNode);
  content.querySelector(".static-content-wrapper").appendChild(staticContent);
  content.addEventListener(
    "click",
    (e) => {
      if (e.target.getAttribute("disabled") !== "disabled") {
        console.log('Do someting on "Click here to open"');
      }
    },
    false
  );
  const loader = content.querySelector(".initial-loading");
  const remotesList = content.querySelector("remotes-list");
  const errorsDisplay = content.querySelector("errors-display");
  const globalCounter = content.querySelector("counter-display.global-counter");
  const qrcodeDisplay = content.querySelector("qrcode-display");
  const buttonOpenRemote = content.querySelector(".open-remote");
  const consoleDisplay = content.querySelector("console-display");
  const footerDisplay = content.querySelector("footer-display");
  footerDisplay.setAttribute("to", new Date().getFullYear());
  // store.subscribe((state) => {
  //   if (state.common.peerId || state.common.signalErrors.length > 0) {
  //     loader.classList.add("hide");
  //   }
  //   if (!state.common.peerId || state.common.signalErrors.length > 0) {
  //     buttonOpenRemote.setAttribute("disabled", "");
  //   } else {
  //     buttonOpenRemote.removeAttribute("disabled");
  //   }
  //   if (state.common.peerId) {
  //     qrcodeDisplay.setAttribute("data", makePeerUrl(state.common.peerId));
  //   } else {
  //     qrcodeDisplay.removeAttribute("data");
  //   }
  //   errorsDisplay.data = state.common.signalErrors;
  //   remotesList.data = state.main.remotes;
  //   globalCounter.setAttribute(
  //     "data",
  //     getGlobalCounterFromMainState(state.main)
  //   );
  //   consoleDisplay.data = [...state.logs].reverse();
  // });
  return {
    content,
    showLoader(display) {
      if (display) {
        loader.classList.remove("hide");
      } else {
        loader.classList.add("hide");
      }
    },
    enableButtonOpenRemote(enabled) {
      if (enabled) {
        buttonOpenRemote.removeAttribute("disabled");
      } else {
        buttonOpenRemote.setAttribute("disabled", "disabled");
      }
    },
    setPeerId(peerId) {
      console.log(`todo setsetQrcode(${peerId})`);
      // todo
      // update qrcode / update link to open
    },
    setQrcode(peerId) {
      if (peerId) {
        qrcodeDisplay.setAttribute("data", makeRemotePeerUrl(peerId));
      } else {
        qrcodeDisplay.removeAttribute("data");
      }
    },
    setRemoteList(data) {
      remotesList.data = data;
    },
    setGlobalCounter(count) {
      globalCounter.setAttribute("data", count);
    },
    setErrors(errors) {
      errorsDisplay.data = errors;
    },
    setConsoleDisplay(logs) {
      consoleDisplay.data = logs;
    },
  };
}
