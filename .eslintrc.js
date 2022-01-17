module.exports = {
  ignorePatterns: ["node_modules/*", "dist/*"],
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["airbnb-base", "plugin:prettier/recommended"],
  parserOptions: {
    ecmaVersion: 13,
    sourceType: "module",
  },
  rules: {
    "prettier/prettier": ["error", {}, { usePrettierrc: true }],
  },
};
