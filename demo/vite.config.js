const { resolve } = require("path");
// eslint-disable-next-line import/no-extraneous-dependencies
const { defineConfig } = require("vite");

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
});
