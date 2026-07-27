/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@packages/eslint-config/react"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Stricter rules for shared libraries
    "no-console": "error",
  },
};