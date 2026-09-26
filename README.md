# Ledger

A private, local-only recovery tracker (PWA). Three layers (Abstinence, Boundaries, Self Care),
with the relationship between them computed from your own data. No accounts, no server, no network.

## Status

Build step 1 of 7: data layer, schema, seed items, export/import, derived metrics, and a 60-day fixture.

## Develop

```sh
npm install
npm run dev        # app at http://localhost:5173
npm test           # unit tests, incl. a printed fixture report
npm run build
```

## Layout

- `src/db/`: Dexie schema (`db.ts`), types, seed items, export/import (`backup.ts`), fixture
- `src/metrics/`: all derived metrics as pure functions (nothing derived is stored)
- `src/lib/dates.ts`: local dates with a configurable day-boundary hour (default 04:00)
- `src/ui/`: screens

Entry values record whether the named thing *happened* that day in every layer
(abstinence: did it, boundary: crossed, self care: done). `isHeld()` turns that into good/bad.
