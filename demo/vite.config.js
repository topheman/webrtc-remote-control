/* eslint-disable import/no-extraneous-dependencies */
const { resolve } = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const vue = require("@vitejs/plugin-vue");

module.exports = defineConfig({
  // necessary for production build with monorepo - vue will use the wrong instance
  // in the node_modules of @webrtc-remote-control/vue and throw errors about:
  // `provide() can only be used inside setup()` / `inject() can only be used inside setup()`
  // https://github.com/vitejs/vite/issues/7454
  resolve: {
    dedupe: ["vue"],
  },
  build: {
    rollupOptions: {
      // https://vitejs.dev/guide/build.html#multi-page-app
      input: {
        main: resolve(__dirname, "index.html"),
        counterVanillaMaster: resolve(__dirname, "counter-vanilla/master.html"),
        counterVanillaRemote: resolve(__dirname, "counter-vanilla/remote.html"),
        counterReact: resolve(__dirname, "counter-react/index.html"),
        counterVue: resolve(__dirname, "counter-vue/index.html"),
        "accelerometer-3d": resolve(__dirname, "accelerometer-3d/index.html"),
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: process.env.PORT || 3000,
  },
  preview: {
    port: process.env.PORT || 3000,
  },
  plugins: [
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
  ],
});
