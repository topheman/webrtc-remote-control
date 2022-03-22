/* eslint-disable import/no-extraneous-dependencies */
const { resolve } = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const vue = require("@vitejs/plugin-vue");

module.exports = defineConfig({
  build: {
    rollupOptions: {
      // https://vitejs.dev/guide/build.html#multi-page-app
      input: {
        main: resolve(__dirname, "index.html"),
        counterMaster: resolve(__dirname, "counter-vanilla/master.html"),
        counterRemote: resolve(__dirname, "counter-vanilla/remote.html"),
        reactCounter: resolve(__dirname, "counter-react/index.html"),
        vueCounter: resolve(__dirname, "counter-vue/index.html"),
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
