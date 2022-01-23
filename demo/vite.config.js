const { resolve } = require("path");
// eslint-disable-next-line import/no-extraneous-dependencies
const { defineConfig } = require("vite");

module.exports = defineConfig({
  build: {
    rollupOptions: {
      // https://vitejs.dev/guide/build.html#multi-page-app
      input: {
        main: resolve(__dirname, "index.html"),
        counterMaster: resolve(__dirname, "counter/index.html"),
        counterRemote: resolve(__dirname, "counter/remote.html"),
      },
    },
  },
});
