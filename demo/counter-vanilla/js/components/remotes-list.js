/* eslint-disable no-underscore-dangle */
import "./counter-display";

class RemotesList extends HTMLElement {
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

  attributeChangedCallback(attrName, oldVal, newVal) {
    if (oldVal !== newVal) {
      if (attrName === "data") {
        try {
          const data = JSON.parse(newVal);
          this._data = data;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(
            "Failed to parse `data` attribute in `remotes-list` element",
            e
          );
        }
      }
      this.render();
    }
  }

  get data() {
    return this._data;
  }

  set data(newVal) {
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
      }:</p><ul>${this.data
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
          }"></counter-display>${remote.name ? ` ${div.innerHTML}` : ""}</li>`;
        })
        .join("")}</ul>`;
    }
    this.shadowRoot.querySelector("div").innerHTML = content;
  }
}

customElements.define("remotes-list", RemotesList);
