/* eslint-disable import/no-extraneous-dependencies */
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import { defineConfig, lazyPlugins } from "vite-plus";

// The repo root has no `"type": "module"`, so this config is `.mjs` rather than
// `.js`: Vite 8 dropped the CommonJS Node API, and the extension is what tells
// Node to load the ESM syntax below.
const entry = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  build: {
    // Rolldown replaced Rollup in Vite 8, and `rollupOptions` became
    // `rolldownOptions`.
    rolldownOptions: {
      // https://vite.dev/guide/build.html#multi-page-app
      input: {
        main: entry("./index.html"),
        counterVanillaMaster: entry("./counter-vanilla/master.html"),
        counterVanillaRemote: entry("./counter-vanilla/remote.html"),
        counterReact: entry("./counter-react/index.html"),
        counterVue: entry("./counter-vue/index.html"),
        "accelerometer-3d": entry("./accelerometer-3d/index.html"),
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: process.env.PORT || 3000,
    // Allow ngrok's free-tier tunnels (random subdomain each run) without
    // disabling Vite's DNS-rebinding host check entirely.
    allowedHosts: [".ngrok-free.app"],
  },
  preview: {
    port: process.env.PORT || 3000,
  },
  plugins: lazyPlugins(() => [
    react(),
    // https://vuejs.org/guide/extras/web-components.html#using-custom-elements-in-vue
    vue({
      template: {
        compilerOptions: {
          // treat all tags with a dash as custom elements
          isCustomElement: (tag) => tag.includes("-"),
        },
      },
    }),
  ]),
});
