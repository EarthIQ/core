import { baseConfig } from "./base";

import type { PrettierConfig, TailwindConfig } from "./types";

// Default config with Tailwind support
export const config: TailwindConfig = {
  ...baseConfig,
  plugins: [...(baseConfig.plugins || []), "prettier-plugin-tailwindcss"],
  tailwindFunctions: ["clsx", "cn", "cva", "twMerge"],
  tailwindAttributes: ["className", "class"],
};

// Named exports
export { baseConfig } from "./base";
export type { PrettierConfig, TailwindConfig } from "./types";

// Default export
export default config;