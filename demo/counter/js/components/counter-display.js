class CounterDisplay extends HTMLElement {
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

  attributeChangedCallback(attrName, oldVal, newVal) {
    if (oldVal !== newVal) {
      this.render();
    }
  }

  render() {
    this.shadowRoot.querySelector("span").innerHTML = this.getAttribute("data");
  }
}

customElements.define("counter-display", CounterDisplay);
