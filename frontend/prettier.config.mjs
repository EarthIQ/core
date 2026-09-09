// Single, workspace-wide Prettier config.
//
// Every app, package, and module frontend resolves to this file (see the
// `format` / `format:check` scripts in the root package.json, which pass
// `--config ./prettier.config.mjs` explicitly). The actual options + plugins
// live in the shared `@packages/prettier-config` package so there is exactly
// one source of truth for code style across the repo.
import config from "@packages/prettier-config";

export default config;
