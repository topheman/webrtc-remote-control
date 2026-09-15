// Single-file-component shim for the `.vue` imports under `counter-vue/`.
// `vp migrate` wrote one of these into `packages/vue/` as well, but they both
// augment the same `*.vue` module in a single program, so the second one was a
// duplicate-identifier error. The demo is the only package with `.vue` files,
// and it is the only one that depends on `vue`, so the shim lives here.
declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    unknown
  >;
  export default component;
}
