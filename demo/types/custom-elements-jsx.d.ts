// The React demos render the shared custom elements straight as JSX tags. React
// passes anything with a dash in the name through to the DOM untouched, but
// TypeScript still needs each tag declared or it reports an unknown intrinsic
// element. The element classes themselves are typed where they are defined -
// each one augments `HTMLElementTagNameMap` next to its `customElements.define`
// call - so this only describes the attributes the JSX call sites set.
import type { DetailedHTMLProps, HTMLAttributes } from "react";

type CustomElementProps<E extends HTMLElement, A = unknown> = DetailedHTMLProps<
  HTMLAttributes<E>,
  E
> &
  A & {
    // JSX has no `className` on these: they are written with the plain `class`
    // attribute, which React forwards as-is for custom elements.
    class?: string;
  };

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "console-display": CustomElementProps<
        HTMLElementTagNameMap["console-display"],
        { data?: string }
      >;
      "counter-display": CustomElementProps<
        HTMLElementTagNameMap["counter-display"],
        { data?: string }
      >;
      "errors-display": CustomElementProps<
        HTMLElementTagNameMap["errors-display"],
        { data?: string }
      >;
      "footer-display": CustomElementProps<
        HTMLElementTagNameMap["footer-display"],
        { from?: number | string; to?: number | string }
      >;
      "qrcode-display": CustomElementProps<
        HTMLElementTagNameMap["qrcode-display"],
        { data?: string; width?: number | string; height?: number | string }
      >;
      "remotes-list": CustomElementProps<
        HTMLElementTagNameMap["remotes-list"],
        { data?: string }
      >;
    }
  }
}
