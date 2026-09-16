/* eslint-disable no-underscore-dangle */
import { humanizeErrors } from "../common";

class ErrorsDisplay extends HTMLElement {
  declare readonly shadowRoot: ShadowRoot;

  private _data: string[] | undefined;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    const ul = document.createElement("ul");
    ul.className = "alert alert-danger hide";
    style.textContent = `
.hide {display:none;}

ul {
  list-style: none;
}

.alert {
  position: relative;
  padding: 0.75rem 1.25rem;
  margin-bottom: 1rem;
  border: 1px solid transparent;
  border-radius: 0.25rem;
}

.alert-danger {
  color: #721c24;
  background-color: #f8d7da;
  border-color: #f5c6cb;
}
    `;
    shadow.appendChild(style);
    shadow.appendChild(ul);
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
          const data = JSON.parse(newVal as string) as string[];
          this._data = data;
        } catch (e) {
          console.error(
            "Failed to parse `data` attribute in `errors-display` element",
            e,
          );
        }
      }
      this.render();
    }
  }

  get data(): string[] | undefined {
    return this._data;
  }

  set data(newVal: string[] | undefined) {
    this._data = newVal;
    this.render();
  }

  render() {
    const ul = this.shadowRoot.querySelector("ul")!;
    let content;
    if (!this._data || this._data.length === 0) {
      ul.classList.add("hide");
    } else {
      const div = document.createElement("div"); // used for error message html sanitizing
      content = humanizeErrors(this._data)
        .map((message) => {
          if (message) {
            div.textContent = message;
            return div.textContent;
          }
          return undefined;
        })
        .filter(Boolean)
        .map((message) => {
          return `<li>${message}</li>`;
        })
        .join("");
      ul.innerHTML = content;
      ul.classList.remove("hide");
    }
  }
}

customElements.define("errors-display", ErrorsDisplay);

declare global {
  interface HTMLElementTagNameMap {
    "errors-display": ErrorsDisplay;
  }
}
