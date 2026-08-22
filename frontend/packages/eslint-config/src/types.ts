import type { Linter } from "eslint";

export type ESLintConfig = Linter.LegacyConfig;

export interface ESLintConfigOptions {
  project?: string | string[];
  tsconfigRootDir?: string;
  ignorePatterns?: string[];
}
