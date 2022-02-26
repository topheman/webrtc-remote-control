import "./components/console-display";
// import "./components/counter-display";
import "./components/errors-display";
import "./components/footer-display";
import "./components/qrcode-display";
import "./components/remotes-list";
// import "./components/twitter-button";

function makeRemotePeerUrl(peerId) {
  return `${
    window.location.origin +
    window.location.pathname
      .replace(/\/$/, "")
      .split("/")
      .slice(0, -1)
      .join("/")
  }/remote.html#${peerId}`;
}

export function render() {
  // create view based on <template> tag content
  const templateNode = document.importNode(
    document.querySelector("template").content,
    true
  );
  const staticContent = document.querySelector(".static-content");
  const { content, ...view } = createView(templateNode, staticContent);
  document.querySelector("#content").innerHTML = "";
  document.querySelector("#content").appendChild(content);
  return view;
}

function createView(templateNode, staticContent) {
  let peerId = null;
  const content = document.createElement("div");
  content.appendChild(templateNode);
  content.querySelector(".static-content-wrapper").appendChild(staticContent);
  const loader = content.querySelector(".initial-loading");
  const remotesList = content.querySelector("remotes-list");
  const errorsDisplay = content.querySelector("errors-display");
  const globalCounter = content.querySelector("counter-display.global-counter");
  const qrcodeDisplay = content.querySelector("qrcode-display");
  const buttonOpenRemote = content.querySelector(".open-remote");
  const consoleDisplay = content.querySelector("console-display");
  const footerDisplay = content.querySelector("footer-display");
  footerDisplay.setAttribute("to", new Date().getFullYear());
  return {
    content,
    showLoader(display) {
      if (display) {
        loader.classList.remove("hide");
      } else {
        loader.classList.add("hide");
      }
    },
    setPeerId(id) {
      peerId = id;
      if (peerId) {
        qrcodeDisplay.setAttribute("data", makeRemotePeerUrl(peerId));
        buttonOpenRemote.setAttribute("href", makeRemotePeerUrl(peerId));
        buttonOpenRemote.removeAttribute("disabled");
      } else {
        qrcodeDisplay.removeAttribute("data");
        buttonOpenRemote.removeAttribute("href");
        buttonOpenRemote.setAttribute("disabled", "disabled");
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
      consoleDisplay.data = [...logs].reverse();
    },
  };
}
