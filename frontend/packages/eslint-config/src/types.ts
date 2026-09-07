import type { Linter } from "eslint";

/**
 * A single ESLint v9 (flat) config object.
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 */
export type FlatConfig = Linter.Config;

/**
 * An array of flat config objects — the shape consumed by an
 * `eslint.config.js` file (and re-exported by this package).
 */
export type FlatConfigArray = Linter.Config[];
