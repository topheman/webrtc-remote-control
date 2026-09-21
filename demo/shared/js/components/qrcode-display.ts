if (typeof QRCode === "undefined") {
  throw new Error(
    "Missing `QRCode` function, please include `qrcode.min.js` as script tags before from https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js",
  );
}

class QRCodeDisplay extends HTMLElement {
  declare readonly shadowRoot: ShadowRoot;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    const run = document.createElement("div"); // wraps the qrcode that will be shown
    run.className = "run";
    const build = document.createElement("div"); // wraps the div where the qrcode is built
    build.className = "build";
    style.textContent = `
.build {
  display: none;
}
    `;
    shadow.appendChild(style);
    shadow.appendChild(run);
    shadow.appendChild(build);
    this.render();
  }

  static get observedAttributes() {
    return ["data", "width", "height", "wrap-anchor"];
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

  // The url is a primitive, so it is reachable both ways - attribute for
  // markup, property for JavaScript - and the setter reflects to the attribute
  // that `render` reads. Before this existed react had only the attribute to
  // write to, which is how a `JSON.stringify` at the call site ended up
  // encoding a quoted url into the QR code. `width`, `height` and `wrap-anchor`
  // stay attribute-only on purpose: nothing sets them from JavaScript, and an
  // accessor no call site uses is the dead code this element just lost.
  get data(): string | null {
    return this.getAttribute("data");
  }

  set data(newVal: string | null | undefined) {
    if (newVal === null || newVal === undefined) {
      this.removeAttribute("data");
    } else {
      this.setAttribute("data", newVal);
    }
  }

  render() {
    const data = this.getAttribute("data");
    let wrapAnchor = false;
    try {
      wrapAnchor = JSON.parse(
        this.getAttribute("wrap-anchor") as string,
      ) as boolean;
    } catch {
      console.warn(
        "Wrong `wrap-anchor` attribute passed to `qrcode-display` (only accepts `true` or `false`)",
      );
      wrapAnchor = false;
    }
    if (data) {
      this.shadowRoot.querySelector(".build")!.innerHTML = "";
      /* eslint-disable */
      new QRCode(this.shadowRoot.querySelector(".build")!, {
        text: this.getAttribute("data") as string,
        width: parseInt(this.getAttribute("width") as string) || 200,
        height: parseInt(this.getAttribute("height") as string) || 200,
        colorDark: "#900000",
      });
      /* eslint-enable */
      const img = this.shadowRoot.querySelector(
        ".build img",
      ) as HTMLImageElement;
      // 😢
      setTimeout(() => {
        img.style.display = "initial";
      }, 0);
      img.title = data;
      this.shadowRoot.querySelector(".run")!.innerHTML = "";
      if (wrapAnchor) {
        const a = document.createElement("a");
        a.href = data;
        a.title = data;
        a.appendChild(img);
        this.shadowRoot.querySelector(".run")!.appendChild(a);
      } else {
        this.shadowRoot.querySelector(".run")!.appendChild(img);
      }
    }
  }
}

customElements.define("qrcode-display", QRCodeDisplay);

declare global {
  interface HTMLElementTagNameMap {
    "qrcode-display": QRCodeDisplay;
  }
}
