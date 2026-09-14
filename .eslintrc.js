module.exports = {
  ignorePatterns: ["node_modules/*", "dist/*"],
  env: {
    browser: true,
    es2021: true,
  },
  globals: {
    Peer: true,
    page: true,
    browser: true,
  },
  extends: [
    "airbnb-base",
    "plugin:prettier/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:react/jsx-runtime",
  ],
  parserOptions: {
    ecmaVersion: 13,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
        optionalDependencies: false,
        peerDependencies: false,
      },
    ],
    "prettier/prettier": ["error", {}, { usePrettierrc: true }],
    "import/prefer-default-export": 0,
    "no-use-before-define": 0,
    // ignore 'React' is defined but never used
    "react/jsx-uses-react": 1,
    "no-restricted-syntax": 0,
  },
  overrides: [
    {
      // `packages/core/master` and `packages/core/remote` carry a package.json only
      // to give microbundle a build root, so dependency lookups for the tests that
      // live under them have to reach up to `packages/core` and the workspace root.
      files: ["packages/core/{master,remote}/**/*.js"],
      rules: {
        "import/no-extraneous-dependencies": [
          "error",
          {
            devDependencies: true,
            optionalDependencies: false,
            peerDependencies: false,
            packageDir: ["./packages/core", "."],
          },
        ],
      },
    },
    {
      // The end-to-end suite is the only thing still on Jest, so it is the only
      // thing that still needs Jest's globals. Unit tests import theirs from vitest.
      files: ["demo/__integration__/**/*.js"],
      env: { jest: true },
    },
    {
      // react-three-fiber renders three.js objects as JSX intrinsics, so every
      // prop on them looks unknown to eslint-plugin-react
      files: ["demo/accelerometer-3d/**/*.jsx"],
      rules: {
        "react/no-unknown-property": 0,
      },
    },
  ],
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx"],
      },
    },
    react: {
      // to avoid "Warning: React version not specified in eslint-plugin-react settings." - https://github.com/yannickcr/eslint-plugin-react/issues/1955
      version: "detect",
    },
  },
};
