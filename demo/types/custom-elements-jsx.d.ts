// The React demos render the shared custom elements straight as JSX tags. React
// passes anything with a dash in the name through to the DOM untouched, but
// TypeScript still needs each tag declared or it reports an unknown intrinsic
// element. The element classes themselves are typed where they are defined -
// each one augments `HTMLElementTagNameMap` next to its `customElements.define`
// call - so this only describes the attributes the JSX call sites set.
//
// Three of them own a `data` accessor, and React 19 assigns a prop whose name
// is already a property of the element instead of setting the attribute. So
// those three take the value itself rather than a serialized string, and the
// type is read off the element so the two cannot drift. The other two have no
// `data` property, only the observed attribute, so React still writes a string
// there.
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

// React 19's types dropped the global `JSX` namespace; it lives at `React.JSX`
// now, reached by augmenting the "react" module. Augmenting "react" rather than
// "react/jsx-runtime" is deliberate: React 19's `react/jsx-runtime` re-exports
// `JSX` from `react`, so the root module covers every JSX resolution mode while
// the runtime module would only cover files compiled under `react-jsx`.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "console-display": CustomElementProps<
        HTMLElementTagNameMap["console-display"],
        { data?: HTMLElementTagNameMap["console-display"]["data"] }
      >;
      "counter-display": CustomElementProps<
        HTMLElementTagNameMap["counter-display"],
        { data?: string }
      >;
      "errors-display": CustomElementProps<
        HTMLElementTagNameMap["errors-display"],
        { data?: HTMLElementTagNameMap["errors-display"]["data"] }
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
        { data?: HTMLElementTagNameMap["remotes-list"]["data"] }
      >;
    }
  }
}
