import type { Linter } from "eslint";
import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier/flat";
import importPlugin from "eslint-plugin-import-x";
import turbo from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

import type { FlatConfigArray } from "./types";

// eslint-plugin-import-x is the maintained fork of eslint-plugin-import that
// supports ESLint 9/10 (the original 2.x line caps peer at ESLint 9 and its
// `import/order` rule calls `sourceCode.getTokenOrCommentBefore`, removed in
// ESLint 10). Its flat presets use `import-x/*` rule names.
const importRecommendedRules =
  importPlugin.flatConfigs?.recommended?.rules ?? {};
const importTypeScriptRules = importPlugin.flatConfigs?.typescript?.rules ?? {};

interface FlatPreset {
  rules?: Linter.RulesRecord;
}

const turboFlatRecommended = (
  turbo.configs as unknown as Record<string, FlatPreset>
)["flat/recommended"];

/**
 * Shared base flat-config for all TypeScript code in the workspace.
 *
 * ESLint 9 flat config (https://eslint.org/docs/latest/use/configure/configuration-files).
 * Type-aware (recommended-type-checked) rules run against the nearest
 * `tsconfig.json` via the typescript-eslint project service.
 */
export const baseConfig: FlatConfigArray = [
  {
    name: "@packages/eslint-config/ignores",
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "*.config.js",
      "*.config.ts",
      "*.config.mjs",
      "*.config.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    name: "@packages/eslint-config/project-service",
    languageOptions: {
      parserOptions: {
        // Use the typescript-eslint project service so every package can
        // enable type-aware rules without per-package `project` paths.
        projectService: true,
      },
    },
  },
  {
    name: "@packages/eslint-config/typescript",
    files: ["**/*.{ts,tsx}"],
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
        "warn",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/await-thenable": "error",
      // The codebase intentionally stringifies loosely-typed values (vendor
      // maplibre/geojson types) — via template text or `String(x)`; ts-eslint
      // v8 flags even the String() form and has no whitelist, so signal only.
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      // Several packages have pre-existing type-resolution gaps (e.g.
      // @packages/map: 700+ tsc errors) that make 'error types' swallow
      // union members; keep as a signal, don't block CI.
      "@typescript-eslint/no-redundant-type-constituents": "warn",
      // Requires `strictNullChecks`; disabled because several workspaces
      // (e.g. apps/web) compile with `strict: false`.
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      // Type-hygiene vs. loosely-typed vendor code (maplibre/geojson): keep
      // as a signal, but don't block CI.
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      // Extracting bound methods from objects is a common pattern here.
      "@typescript-eslint/unbound-method": "warn",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": "allow-with-description",
          "ts-nocheck": "allow-with-description",
          "ts-check": false,
        },
      ],
    },
  },
  {
    name: "@packages/eslint-config/import",
    files: ["**/*.{ts,tsx}"],
    plugins: { "import-x": importPlugin },
    settings: {
      "import-x/resolver": {
        typescript: true,
      },
    },
    rules: {
      ...importRecommendedRules,
      ...importTypeScriptRules,

      // ━━━ Import ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      "import-x/order": [
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
      "import-x/no-duplicates": "off",
      // Repo has no turbo.json (built via pnpm + docker); the rule can
      // never be satisfied, so keep it off.
      "turbo/no-undeclared-env-vars": "off",
      "import-x/no-unresolved": "off",
      "import-x/no-named-as-default-member": "off",
      "import-x/no-named-as-default": "off",
      "import-x/namespace": "off",
    },
  },
  {
    name: "@packages/eslint-config/general",
    rules: {
      // ━━━ General ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      // New in ESLint 10's `eslint:recommended` (error by default). Keeps the
      // existing "signal, don't block CI" posture for the few pre-existing
      // control-flow assignment sites the codebase already had.
      "no-useless-assignment": "warn",
    },
  },
  {
    name: "@packages/eslint-config/turbo",
    plugins: { turbo },
    // Merge the opt-outs into the preset object itself — in flat config a
    // later object wins, so an "off" in an earlier block would be overridden
    // by the preset's recommended rules.
    rules: {
      ...turboFlatRecommended?.rules,
      // Repo has no turbo.json (built via pnpm + docker); the rule can
      // never be satisfied, so keep it off.
      "turbo/no-undeclared-env-vars": "off",
    },
  },
  // Turn off rules that conflict with Prettier — must stay last.
  prettierConfig,
];

export default baseConfig;
