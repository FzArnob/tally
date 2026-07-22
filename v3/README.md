# Tally Store — v3 (React + TypeScript + Vite)

A modern, fully-responsive rewrite of the v1 UI. Same PHP API and MySQL
database — only the front end changed.

## Features

- **Product cash-flow grid** — add/edit products (with image, quantity type),
  record Stock In / Sale entries, view per-product history, edit & delete entries.
- **Customer balances** — right-side drawer with search, totals, an embedded
  calculator keypad, Paid/Unpaid entries and per-customer history.
- **Localization** — English & বাংলা, with Bengali numerals and locale-aware
  currency/date formatting. Selection persists in a cookie.
- Light/dark theme (follows the OS), smooth animations, reduced-motion support.

## Tech

- React 19 + TypeScript (strict), Vite 6, CSS Modules + design tokens.
- No UI framework — small bundle (~73 kB gzipped total).

## Project structure

```
src/
  components/      Header, LanguageSwitcher, Modal, ConfirmDialog (shared UI)
  features/
    products/      grid, form, stock/sale, history
    customers/     drawer, calculator, form, history
  i18n/            translations (en/bn) + LanguageContext
  lib/             api client, formatters, calculator engine, cookies
  styles/          design tokens + global styles
  types.ts         API response types
```

## API configuration

The app talks to the existing endpoints in `../api/`. The base URL is set in
[`.env`](./.env):

```
VITE_API_BASE=/tally/api/
```

This matches the default XAMPP layout (`http://localhost/tally/`). If you deploy
the project under a different path, update this value.

## Develop

```bash
npm install
npm run dev
```

The dev server (http://localhost:5173) proxies `VITE_API_BASE` to
`http://localhost`, so make sure XAMPP/Apache + MySQL are running.

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

Because `base` is `./`, the built `dist/` is path-independent — copy it anywhere
under the web root (e.g. serve it at `http://localhost/tally/v3/dist/`). Ensure
`VITE_API_BASE` still resolves to the PHP `api/` folder from wherever it is served.
