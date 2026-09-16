import type { LogEntry } from "../../shared/js/common";

import "../../shared/js/components/errors-display";
import "../../shared/js/components/console-display";
import "../../shared/js/components/footer-display";

export interface RemoteViewEvents {
  onClickPlus(): void;
  onClickMinus(): void;
  onUpdateName(name: string): void;
}

export interface RemoteViewInitialState {
  initialName?: string;
}

const defaultEvents: RemoteViewEvents = {
  onClickPlus() {},
  onClickMinus() {},
  onUpdateName() {},
};

export function render(initialState?: RemoteViewInitialState) {
  // create view based on <template> tag content
  const templateNode = document.importNode(
    document.querySelector("template")!.content,
    true,
  );
  const staticContent = document.querySelector(".static-content")!;
  const { content, ...view } = createView(
    templateNode,
    staticContent,
    initialState,
  );
  document.querySelector("#content")!.innerHTML = "";
  document.querySelector("#content")!.appendChild(content);
  return view;
}

function createView(
  templateNode: DocumentFragment,
  staticContent: Element,
  initialState: RemoteViewInitialState = {
    initialName: "",
  },
) {
  let events = { ...defaultEvents };
  const content = document.createElement("div");
  content.appendChild(templateNode);
  content.querySelector(".static-content-wrapper")!.appendChild(staticContent);
  const loader = content.querySelector(".initial-loading")!;
  const errorsDisplay = content.querySelector("errors-display")!;
  const formInput = content.querySelector<HTMLInputElement>(
    ".form-set-name input",
  )!;
  const formButton = content.querySelector(".form-set-name button")!;
  const buttons = content.querySelectorAll(".counter-control button");
  formInput.value = initialState.initialName ?? "";
  const consoleDisplay = content.querySelector("console-display")!;
  const footerDisplay = content.querySelector("footer-display")!;
  footerDisplay.setAttribute("to", String(new Date().getFullYear()));
  // event delegation
  content.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("counter-control-add")) {
        events.onClickPlus();
        return;
      }
      if (target.classList.contains("counter-control-sub")) {
        events.onClickMinus();
      }
    },
    false,
  );
  content.addEventListener(
    "submit",
    (e) => {
      const target = e.target as HTMLFormElement;
      if (target.classList.contains("form-set-name")) {
        e.preventDefault();
        events.onUpdateName(
          target.querySelector<HTMLInputElement>("input")!.value,
        );
      }
    },
    false,
  );
  return {
    content,
    setEvents(passedEvents: RemoteViewEvents) {
      events = passedEvents;
    },
    showLoader(display: boolean) {
      if (display) {
        loader.classList.remove("hide");
      } else {
        loader.classList.add("hide");
      }
    },
    setErrors(errors: string[]) {
      errorsDisplay.data = errors;
    },
    setConsoleDisplay(logs: LogEntry[]) {
      consoleDisplay.data = [...logs].reverse();
    },
    setConnected(connected: boolean) {
      [...buttons, formInput, formButton].forEach((button) => {
        if (!connected) {
          button.setAttribute("disabled", "");
        } else {
          button.removeAttribute("disabled");
        }
      });
    },
  };
  // store.subscribe((state) => {
  //   if (state.common.peerId || state.common.signalErrors.length > 0) {
  //     loader.classList.add("hide");
  //   }
  //   [...buttons, formInput, formButton].forEach((button) => {
  //     if (isDisconnected(state)) {
  //       button.setAttribute("disabled", "");
  //     } else {
  //       button.removeAttribute("disabled");
  //     }
  //   });
  //   errorsDisplay.data = [
  //     isDisconnected(state) && isLocalIp(location.hostname)
  //       ? `You're disconnected.<br/>You are running the app in development on a <strong>local ip</strong> (${location.hostname}) (<strong>without https</strong>) which leads to disconnections.<br/><strong>Use tools such as localtunnel.me or ngrock.io to test with mobile devices</strong>.<br/>Features such as <strong>WebRTC need https</strong> in production.`
  //       : "",
  //     ...state.common.signalErrors,
  //   ].filter(Boolean);
  //   consoleDisplay.data = [...state.logs].reverse();
  // });
  // return content;
}
