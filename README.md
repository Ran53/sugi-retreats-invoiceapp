# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Supabase persistence

This version uses Supabase as the cloud data store for settings, clients, items, invoices, expenses, and expense categories. `localStorage` is retained only as a browser cache/fallback so the existing UI remains fast and the app can recover temporarily if the network is unavailable.

Before first deployment, open the Supabase SQL editor for project `sugi-invoice` and run `farmstay_supabase.sql` once. The browser uses the Supabase publishable key only; the Supabase secret key is never included in this project.

This installation intentionally has no authentication, so the SQL policies allow anonymous browser access. Anyone who obtains the public app/project credentials can read or modify the stored data. For a private production system, authentication + per-user RLS should be added later.
