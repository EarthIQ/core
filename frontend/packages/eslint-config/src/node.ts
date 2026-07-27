import { baseConfig } from "./base";

import type { ESLintConfig } from "./types";

export const nodeConfig: ESLintConfig = {
  ...baseConfig,
  env: {
    node: true,
    es2024: true,
  },
  rules: {
    ...baseConfig.rules,

    // ━━━ Node.js Specific ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "no-process-exit": "error",
    "@typescript-eslint/no-require-imports": "off",
    "no-console": "off", // Allow console in Node.js

    // Remove browser-specific restrictions
    "no-restricted-imports": "off",
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**/*.ts"],
      rules: {
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};

export default nodeConfig;