import { reactConfig } from "@packages/eslint-config";

/**
 * ESLint 9 flat config for @packages/cookie-consent.
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  {
    name: "cookie-consent/ignores",
    // Root-level demo entries that are not part of the library `src`.
    ignores: ["Analytics.tsx", "PrivacySettings.tsx"],
  },
  ...reactConfig,
];
