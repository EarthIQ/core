import type { PrettierConfig } from "./types";

export const baseConfig: PrettierConfig = {
  // Width
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,

  // Syntax
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  jsxSingleQuote: false,

  // Trailing
  trailingComma: "es5",
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow Functions
  arrowParens: "always",

  // Range
  rangeStart: 0,
  rangeEnd: Infinity,

  // Prose
  proseWrap: "preserve",

  // HTML
  htmlWhitespaceSensitivity: "css",

  // End of Line
  endOfLine: "lf",

  // Embedded
  embeddedLanguageFormatting: "auto",

  // Single Attribute Per Line
  singleAttributePerLine: true,

  // Plugins
  plugins: ["prettier-plugin-packagejson"],
};

export default baseConfig;