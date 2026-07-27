import type { Config } from "prettier";

export type PrettierConfig = Config;

export interface TailwindConfig extends Config {
  tailwindFunctions?: string[];
  tailwindAttributes?: string[];
}