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
