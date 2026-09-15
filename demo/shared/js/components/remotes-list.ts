/* eslint-disable no-underscore-dangle */
import type { RemoteCounter } from "../counter.master.logic";

import "./counter-display";

/** The payload of both events this element dispatches. */
export interface PingEventDetail {
  all: boolean;
  id: string | null;
}

class RemotesList extends HTMLElement {
  declare readonly shadowRoot: ShadowRoot;

  private _data: RemoteCounter[] | undefined;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    const div = document.createElement("div");
    style.textContent = `
ul {
  list-style: none;
  padding-left: 0;
}
li::before {
  padding-left: 5px;
  content: "📱";
}
.remote-peerId {
  font-size: 80%;
}
.ping-button {
  border: 0;
  padding: 3px;
  vertical-align: bottom;
  cursor: pointer;
}
.ping-button::after {
  content: " 🔔"
}
counter-display {
  font-weight: bold;
  font-size: 120%;
}
    `;
    shadow.appendChild(style);
    shadow.appendChild(div);
    this.render();
  }

  static get observedAttributes() {
    return ["data"];
  }

  /**
   * Accept a `data` attribute with a serialized object
   * `data` attribute is not kept in sync with `data` property
   * for performance reasons (to avoid large object serialization)
   */

  attributeChangedCallback(
    attrName: string,
    oldVal: string | null,
    newVal: string | null,
  ) {
    if (oldVal !== newVal) {
      if (attrName === "data") {
        try {
          const data = JSON.parse(newVal as string) as RemoteCounter[];
          this._data = data;
        } catch (e) {
          console.error(
            "Failed to parse `data` attribute in `remotes-list` element",
            e,
          );
        }
      }
      this.render();
    }
  }

  get data(): RemoteCounter[] | undefined {
    return this._data;
  }

  set data(newVal: RemoteCounter[] | undefined) {
    this._data = newVal;
    this.render();
  }

  render() {
    let content;
    if (!this._data) {
      content = "<p>No connected remotes</p>";
    } else {
      const div = document.createElement("div"); // used for remote.name sanitizing
      content = `<p>${this._data.length} connected remote${
        this._data.length > 1 ? "s" : ""
      } <button class="ping-button ping-all">PING ALL</button></p><ul>${this._data
        .slice()
        .sort((a, b) => (a.peerId > b.peerId ? 1 : -1))
        .map((remote) => {
          if (remote.name) {
            div.textContent = remote.name;
          }
          return `<li><span class="remote-peerId">${
            remote.peerId
          }</span> counter: <counter-display data="${
            remote.counter
          }"></counter-display>${
            remote.name ? ` ${div.innerHTML}` : ""
          } <button class="ping-button ping-one" data-id="${
            remote.peerId
          }">PING</button></li>`;
        })
        .join("")}</ul>`;
    }
    this.shadowRoot.querySelector("div")!.innerHTML = content;
  }

  /**
   * Triggered when the shadowRoot is append to the document
   *
   * Exposes two events:
   * - `pingAll`: ({detail: {all: true, id: null}})
   * - `ping`: ({detail: {all: false, id: "someid"}})
   */
  connectedCallback() {
    // event delegation - the webcomponent way
    this.shadowRoot.addEventListener("click", (e) => {
      for (const target of e.composedPath()) {
        const elm = target as HTMLElement;
        if (elm.classList?.contains("ping-button")) {
          if (elm.classList.contains("ping-all")) {
            this.dispatchEvent(
              new CustomEvent<PingEventDetail>("pingAll", {
                detail: {
                  all: true,
                  id: null,
                },
                bubbles: true,
                composed: true,
              }),
            );
            break;
          }
          if (elm.classList.contains("ping-one")) {
            this.dispatchEvent(
              new CustomEvent<PingEventDetail>("ping", {
                detail: {
                  all: false,
                  id: elm.dataset.id ?? null,
                },
                bubbles: true,
                composed: true,
              }),
            );
            break;
          }
        }
      }
    });
  }
}

customElements.define("remotes-list", RemotesList);

declare global {
  interface HTMLElementTagNameMap {
    "remotes-list": RemotesList;
  }

  interface HTMLElementEventMap {
    ping: CustomEvent<PingEventDetail>;
    pingAll: CustomEvent<PingEventDetail>;
  }
}
