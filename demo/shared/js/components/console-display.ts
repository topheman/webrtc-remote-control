/* eslint-disable no-underscore-dangle */
import type { LogEntry } from "../common";

class ConsoleDisplay extends HTMLElement {
  // The constructor always attaches an open shadow root, so the inherited
  // `ShadowRoot | null` is narrowed here once rather than asserted in every
  // method. `declare` emits nothing.
  declare readonly shadowRoot: ShadowRoot;

  private _data: LogEntry[] | undefined;

  constructor() {
    super();
    const template = document.createElement("template");
    template.innerHTML = `
<style>
:host {
  --border-color: grey;
}
.header {
  padding: 5px;
  border: 1px solid var(--border-color);
  border-bottom: 0px;
  display: block;
  cursor: pointer;
}
.slideup .header:after {
  content: " 🔽";
}
.slidedown .header:after {
  content: " 🔼";
}
div.wrapper {
  overflow-x: scroll;
  border: 1px solid var(--border-color);
}
ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
  width: 100%;
  overflow-x: scroll;
  display: table;
  width: 100%;
}
li {
  white-space: nowrap;
  display: table-row;
}
li.two {
  background: #f1f1f1;
}
li.three {
  background: lightgray;
}
li.warn {
  background: lightyellow;
}
li::before {
  margin-left: 8px;
}
li.info::before {
  content: " ℹ️"
}
li.warn::before {
  content: " ⚠️"
}
li.log::before {
  content: " 📋"
}
.slideup div, .slidedown div {
    max-height: 0;
    overflow-y: hidden;
    -webkit-transition: max-height 0.5s ease-in-out;
    -moz-transition: max-height 0.5s ease-in-out;
    -o-transition: max-height 0.5s ease-in-out;
    transition: max-height 0.5s ease-in-out;
}
.slidedown div {
    max-height: 1000px ;
}
</style>
<div class="slidedown">
  <span class="header">Logs</span>
  <div class="wrapper">
    <ul></ul>
  </div>
</div>
    `;
    const shadow = this.attachShadow({ mode: "open" });
    shadow.appendChild(template.content.cloneNode(true));
    shadow.querySelector(".header")!.addEventListener(
      "click",
      () => {
        const rootDivClassList =
          this.shadowRoot.querySelector("div")!.classList;
        rootDivClassList.toggle("slidedown");
        rootDivClassList.toggle("slideup");
      },
      false,
    );
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
          const data = JSON.parse(newVal as string) as LogEntry[];
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

  get data(): LogEntry[] | undefined {
    return this._data;
  }

  set data(newVal: LogEntry[] | undefined) {
    this._data = newVal;
    this.render();
  }

  render() {
    const ul = this.shadowRoot.querySelector("ul")!;
    const content = (this._data ?? [])
      .map((line) => {
        return `<li class="${line.level} ${
          // eslint-disable-next-line no-nested-ternary
          line.key % 3 === 1 ? "two" : line.key % 3 === 2 ? "three" : ""
        }">${
          typeof line.payload === "object"
            ? (() => {
                try {
                  return JSON.stringify(line.payload);
                } catch {
                  return "";
                }
              })()
            : String(line.payload)
        }</li>`;
      })
      .join("");
    ul.innerHTML = content;
  }
}

customElements.define("console-display", ConsoleDisplay);

declare global {
  interface HTMLElementTagNameMap {
    "console-display": ConsoleDisplay;
  }
}
