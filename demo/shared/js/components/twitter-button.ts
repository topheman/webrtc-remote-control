/**
 * Inspired by https://github.com/topheman/npm-registry-browser/blob/master/src/components/TwitterButton.js
 */

const defaultAttributes = {
  size: "l",
  lang: "en",
  dnt: false,
  buttonTitle: "Twitter Tweet Button",
  text: null,
  url: null,
  hashtags: null,
  via: null,
  related: null,
  className: null,
  style: null,
};

class TwitterButton extends HTMLElement {
  declare readonly shadowRoot: ShadowRoot;

  // Every key of `defaultAttributes` is turned into an accessor over the
  // matching attribute by the `defineProperty` loop below, so they all read
  // back as `string | null`. `lang`, `className` and `style` are deliberately
  // left off this list: the loop shadows HTMLElement's own accessors for them,
  // but re-declaring them here with an attribute type would conflict with the
  // base class, and nothing reads them as anything but a string.
  declare size: string | null;
  declare dnt: string | null;
  declare buttonTitle: string | null;
  declare text: string | null;
  declare url: string | null;
  declare hashtags: string | null;
  declare via: string | null;
  declare related: string | null;

  constructor() {
    super();
    this.initDefaultValues();
    const template = document.createElement("template");
    template.innerHTML = `
<style>
  :host {
    display: inline-block;
  }
</style>
<iframe allowtransparency="true" frameborder="0" scrolling="no" width="82px" height="28px"></iframe>
    `;
    const shadow = this.attachShadow({ mode: "open" });
    shadow.appendChild(template.content.cloneNode(true));
    this.render();
  }

  initDefaultValues() {
    const self = this as unknown as Record<string, unknown>;
    Object.entries(defaultAttributes).forEach(
      ([attributeName, defaultValue]) => {
        self[attributeName] = self[attributeName] || defaultValue;
      },
    );
  }

  static get observedAttributes() {
    return Object.keys(defaultAttributes);
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
    const params = [
      `size=${this.size}`,
      "count=none",
      `dnt=${this.dnt}`,
      `lang=${this.lang}`,
      this.text != null && `text=${encodeURIComponent(this.text)}`,
      this.url != null && `url=${encodeURIComponent(this.url)}`,
      this.hashtags != null && `hashtags=${encodeURIComponent(this.hashtags)}`,
      this.via != null && `via=${encodeURIComponent(this.via)}`,
      this.related != null && `related=${encodeURIComponent(this.related)}`,
    ]
      .filter(Boolean)
      .join("&");
    const iframe = this.shadowRoot.querySelector("iframe")!;
    iframe.src = `https://platform.twitter.com/widgets/tweet_button.html?${params}`;
    iframe.title = this.buttonTitle as string;
  }
}

Object.keys(defaultAttributes).forEach((attributeName) => {
  Object.defineProperty(TwitterButton.prototype, attributeName, {
    get(this: TwitterButton) {
      return this.getAttribute(attributeName);
    },
    set(this: TwitterButton, value: unknown) {
      if (typeof value === "undefined" || value === null) {
        this.removeAttribute(attributeName);
      } else {
        this.setAttribute(attributeName, String(value));
      }
    },
  });
});

customElements.define("twitter-button", TwitterButton);

declare global {
  interface HTMLElementTagNameMap {
    "twitter-button": TwitterButton;
  }
}
