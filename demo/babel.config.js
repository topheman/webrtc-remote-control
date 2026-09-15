module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    // The end-to-end suite is still on Jest and Babel, and it imports
    // `test.helpers.ts`. Babel only strips the annotations here - type
    // checking is `vp check`'s job. Goes away with Jest in the Playwright
    // migration.
    "@babel/preset-typescript",
  ],
};
