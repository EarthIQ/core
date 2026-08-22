import type { ESLintConfig } from "./types";

export const baseConfig: ESLintConfig = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:turbo/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "import"],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
      },
      node: true,
    },
  },
  rules: {
    // ━━━ TypeScript ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      },
    ],
    "@typescript-eslint/consistent-type-exports": [
      "warn",
      { fixMixedExportsWithInlineTypeSpecifier: true },
    ],
    "@typescript-eslint/no-misused-promises": [
      "error",
      { checksVoidReturn: { attributes: false } },
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "warn",
    "@typescript-eslint/prefer-nullish-coalescing": "warn",
    "@typescript-eslint/prefer-optional-chain": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": true,
        "ts-nocheck": true,
        "ts-check": false,
      },
    ],

    // ━━━ Import ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index",
          "object",
          "type",
        ],
        pathGroups: [
          {
            pattern: "@/**",
            group: "internal",
            position: "before",
          },
        ],
        pathGroupsExcludedImportTypes: ["type"],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "import/no-duplicates": ["error", { "prefer-inline": true }],
    "import/no-unresolved": "off",
    "import/no-named-as-default-member": "off",
    "import/no-named-as-default": "off",
    "import/namespace": "off",

    // ━━━ General ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prefer-const": "error",
    eqeqeq: ["error", "always", { null: "ignore" }],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["../*"],
            message: "Prefer absolute imports using @/ alias",
          },
        ],
      },
    ],
  },
  ignorePatterns: [
    "node_modules",
    "dist",
    "build",
    ".next",
    ".turbo",
    "coverage",
    "*.config.js",
    "*.config.ts",
    "*.config.mjs",
    "*.config.cjs",
  ],
};

export default baseConfig;
