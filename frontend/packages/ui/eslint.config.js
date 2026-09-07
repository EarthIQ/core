const { reactConfig } = require("@packages/eslint-config");

/**
 * ESLint 9 flat config for @packages/ui.
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 *
 * @type {import("eslint").Linter.Config[]}
 */
module.exports = [
  {
    name: "ui/ignores",
    ignores: [".storybook/**"],
  },
  ...reactConfig,
  {
    name: "ui/strict",
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Stricter rules for shared libraries
      "no-console": "error",
    },
  },
];
