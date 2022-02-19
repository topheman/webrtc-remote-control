/* eslint-disable import/no-extraneous-dependencies */
const { resolve } = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  build: {
    rollupOptions: {
      // https://vitejs.dev/guide/build.html#multi-page-app
      input: {
        main: resolve(__dirname, "index.html"),
        counterMaster: resolve(__dirname, "counter/master.html"),
        counterRemote: resolve(__dirname, "counter/remote.html"),
        reactCounter: resolve(__dirname, "react-counter/index.html"),
      },
    },
  },
  server: {
    host: "0.0.0.0",
  },
  plugins: [react()],
});
