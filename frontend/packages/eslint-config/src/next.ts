import { reactConfig } from "./react";

import type { ESLintConfig } from "./types";

const reactExtends = reactConfig.extends as string[];

export const nextConfig: ESLintConfig = {
  ...reactConfig,
  extends: [
    ...reactExtends.filter((ext) => ext !== "prettier"),
    "next/core-web-vitals",
    "prettier",
  ],
  rules: {
    ...reactConfig.rules,

    // ━━━ Next.js Specific ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "@next/next/no-html-link-for-pages": "off",
    "jsx-a11y/anchor-is-valid": "off", // Next.js Link handles this

    // Allow default exports for pages
    "import/no-default-export": "off",
  },
  overrides: [
    ...(reactConfig.overrides || []),
    {
      // Allow default exports for Next.js conventions
      files: [
        "src/app/**/*.tsx",
        "src/pages/**/*.tsx",
        "app/**/*.tsx",
        "pages/**/*.tsx",
        "*.config.ts",
        "*.config.js",
      ],
      rules: {
        "import/no-default-export": "off",
      },
    },
  ],
};

export default nextConfig;