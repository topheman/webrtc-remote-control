module.exports = {
  ignorePatterns: ["node_modules/*", "dist/*"],
  env: {
    browser: true,
    es2021: true,
    jest: true,
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
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx"],
      },
    },
    react: {
      // to avoid "Warning: React version not specified in eslint-plugin-react settings." - https://github.com/yannickcr/eslint-plugin-react/issues/1955
      version: "latest",
    },
  },
};
