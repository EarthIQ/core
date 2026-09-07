import { reactConfig } from "@packages/eslint-config";

/**
 * ESLint 9 flat config for @packages/charts.
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...reactConfig,
  {
    name: "charts/strict",
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Stricter rules for shared libraries
      "no-console": "error",
    },
  },
];
