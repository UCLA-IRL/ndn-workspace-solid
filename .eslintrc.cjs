module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:solid/recommended",
    "plugin:prettier/recommended",
  ],
  ignorePatterns: ["dist/*", ".eslintrc.cjs", "public/*", "src/build-meta.ts"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "solid"],
  rules: {
    // The following two are for debug use. Should fix before release.
    "@typescript-eslint/no-unused-vars": "warn",
    "prefer-const": "warn",
    // NDNts style class & namespace combination requires turning off the following
    "@typescript-eslint/no-namespace": "off",
    // Some cannot be fixed due to dependency issue
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
        singleQuote: true,
        useTabs: false,
        tabWidth: 2,
        printWidth: 120,
        semi: false,
      },
    ],
  },
};
