import globals from "globals";

import { baseConfig } from "./base";
import type { FlatConfigArray } from "./types";

/**
 * Flat config for Node.js (server-side / tooling) TypeScript code.
 */
export const nodeConfig: FlatConfigArray = [
  ...baseConfig,
  {
    name: "@packages/eslint-config/node",
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: {
      // ━━━ Node.js Specific ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      "no-process-exit": "error",
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off", // Allow console in Node.js
    },
  },
  {
    name: "@packages/eslint-config/node-tests",
    files: ["**/*.{test,spec}.ts", "**/__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default nodeConfig;
