module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:solid/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['solid'],
  rules: {
    // The following two are for debug use. Should fix before release.
    "@typescript-eslint/no-unused-vars": "warn",
    'prefer-const': 'warn',
    // NDNts style class & namespace combination requires turning off the following
    '@typescript-eslint/no-namespace': 'off',
    // Some cannot be fixed due to dependency issue
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
  },
}
