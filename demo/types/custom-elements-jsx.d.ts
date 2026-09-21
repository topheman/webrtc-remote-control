// The pieces of UI the demos share - the log console, the error box, the list
// of connected remotes, the QR code - are custom elements rather than a
// component per framework. That is the point of them: the same demo exists in
// vanilla, react and vue, and a custom element is the one component model all
// three can render. They live in `demo/shared/js/components`, one file each,
// and every file ends with the `customElements.define` call and a
// `declare global` block adding its tag to `HTMLElementTagNameMap`. That is
// where each element's own type comes from, here and everywhere else.
//
// This file exists only for the react side. React passes any tag with a dash
// in its name through to the DOM untouched, so the elements work at runtime
// with nothing declared, but TypeScript reports an unknown intrinsic element
// until each tag is listed as JSX. So this describes the props the react call
// sites pass, and reads the element type itself out of `HTMLElementTagNameMap`
// rather than restating it.
//
// The `data` prop is not the same kind of thing on all six, which is worth
// knowing before changing one. `console-display`, `errors-display` and
// `remotes-list` hold a list and expose a `data` accessor taking the parsed
// value; they also observe a `data` attribute carrying a JSON string, but do
// not mirror the property back to it. `counter-display` and `qrcode-display`
// have only the attribute.
//
// That distinction started to matter with React 19. Setting a prop on a custom
// element, it now checks `name in element` and, when that holds, assigns the
// property - `element[name] = value` - falling back to `setAttribute` only when
// it does not. React 18 always set the attribute, so a value had to be
// serialized on the way in. The three elements with an accessor therefore take
// the value itself now, typed off the accessor so the two cannot drift. The
// other two are still reached through `setAttribute`, and what belongs there is
// the plain string the element reads - a url, a number - not a serialized one.
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
