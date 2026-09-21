class CounterDisplay extends HTMLElement {
  declare readonly shadowRoot: ShadowRoot;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    const span = document.createElement("span");
    style.textContent = `
span {
  color: #900000;
  animation-name: counter-change;
  animation-duration: 0.5s;
}
@keyframes counter-change {
  0%   {color: #900000;}
  50%  {color: red;}
  100%  {color: #900000;}
}
    `;
    shadow.appendChild(style);
    shadow.appendChild(span);
    this.render();
  }

  static get observedAttributes() {
    return ["data"];
  }

  attributeChangedCallback(
    attrName: string,
    oldVal: string | null,
    newVal: string | null,
  ) {
    if (oldVal !== newVal) {
      this.render();
    }
  }

  // A primitive, so the attribute and the property are two views of one value,
  // the way `value` is on a native `<input>`: the setter reflects to the
  // attribute, the getter reads it back, and `render` keeps the attribute as
  // its single source. Both paths are live - `remotes-list` renders one of
  // these into its own markup with a `data` attribute, while the three
  // frameworks all assign the property. The list elements next to this one
  // (`console-display`, `errors-display`, `remotes-list`) hold rich data and so
  // expose the property alone; `demo/types/custom-elements-jsx.d.ts` explains
  // the split and why react depends on it.
  get data(): string | null {
    return this.getAttribute("data");
  }

  set data(newVal: string | number | null | undefined) {
    if (newVal === null || newVal === undefined) {
      this.removeAttribute("data");
    } else {
      this.setAttribute("data", String(newVal));
    }
  }

  render() {
    // `getAttribute` returns null before `data` is set, and assigning null to
    // `innerHTML` writes the string "null" - which is what this rendered
    // before the port, and what the markup expects for an unset counter.
    this.shadowRoot.querySelector("span")!.innerHTML = this.getAttribute(
      "data",
    ) as string;
  }
}

customElements.define("counter-display", CounterDisplay);

declare global {
  interface HTMLElementTagNameMap {
    "counter-display": CounterDisplay;
  }
}
