import type { Linter } from "eslint";

export type ESLintConfig = Linter.Config;

export interface ESLintConfigOptions {
  project?: string | string[];
  tsconfigRootDir?: string;
  ignorePatterns?: string[];
}