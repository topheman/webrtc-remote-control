/* prettier-ignore */
export default {
  testEnvironment: "jest-environment-jsdom",

  // Tests run against the core source rather than its build output, so the whole
  // baseline stays independent of microbundle.
  moduleNameMapper: {
    "^@webrtc-remote-control/core$": "<rootDir>/../core/src/core.index.js",
  },

  testPathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/node_modules/"],

  watchPathIgnorePatterns: [".tmp"],
};
