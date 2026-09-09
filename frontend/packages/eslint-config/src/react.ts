import type { Linter } from "eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

import { baseConfig } from "./base";
import type { FlatConfigArray } from "./types";

interface FlatPreset {
  rules?: Linter.RulesRecord;
}

const reactFlat = (
  react.configs as unknown as Record<string, Record<string, FlatPreset>>
)["flat"];
const reactHooksFlat = (
  reactHooks.configs as unknown as Record<string, Record<string, FlatPreset>>
)["flat"];
const a11yRecommended = jsxA11y.configs.recommended as Linter.LegacyConfig;

/**
 * Flat config for React + TypeScript apps and libraries.
 *
 * Layers the React plugin flat presets (recommended + jsx-runtime),
 * react-hooks (recommended-latest), and jsx-a11y on top of `baseConfig`.
 */
export const reactConfig: FlatConfigArray = [
  ...baseConfig,
  {
    name: "@packages/eslint-config/react",
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      react: {
        // Explicit version (not "detect"): detection calls `context.getFilename`,
        // which ESLint 10 removed. Workspace pins React 19.
        version: "19",
      },
    },
    rules: {
      ...(reactFlat?.["recommended"]?.rules ?? {}),
      ...(reactFlat?.["jsx-runtime"]?.rules ?? {}),
      ...(reactHooksFlat?.["recommended-latest"]?.rules ?? {}),
      ...(a11yRecommended?.rules ?? {}),

      // ━━━ React ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      "react/prop-types": "off",
      "react/display-name": "off",
      "react/self-closing-comp": [
        "error",
        {
          component: true,
          html: true,
        },
      ],
      "react/jsx-boolean-value": ["error", "never"],
      "react/jsx-curly-brace-presence": [
        "error",
        {
          props: "never",
          children: "never",
          propElementValues: "always",
        },
      ],
      "react/jsx-no-useless-fragment": ["error", { allowExpressions: true }],
      "react/jsx-sort-props": [
        "warn",
        {
          callbacksLast: true,
          shorthandFirst: true,
          reservedFirst: true,
          multiline: "last",
        },
      ],
      "react/function-component-definition": [
        "warn",
        {
          namedComponents: "arrow-function",
          unnamedComponents: "arrow-function",
        },
      ],
      "react/hook-use-state": "warn",
      "react/jsx-no-leaked-render": [
        "error",
        { validStrategies: ["ternary", "coerce"] },
      ],

      // ━━━ React Hooks ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // React 19 era heuristics: keep visible, don't block CI.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/use-memo": "warn",

      // ━━━ Accessibility ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      "jsx-a11y/anchor-is-valid": [
        "warn",
        {
          components: ["Link"],
          specialLink: ["hrefLeft", "hrefRight"],
          aspects: ["invalidHref", "preferButton"],
        },
      ],
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/no-autofocus": "warn",

      // Stylistic presets from `react/recommended` that the codebase predates.
      "react/no-unescaped-entities": "warn",
    },
  } as unknown as Linter.Config,
  {
    name: "@packages/eslint-config/react-tests",
    files: ["**/*.{test,spec}.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react/jsx-no-leaked-render": "off",
    },
  },
  {
    name: "@packages/eslint-config/react-stories",
    files: ["**/*.stories.{js,jsx,ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default reactConfig;
