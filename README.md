# Aquads (MVP)

On‑chain ad slots for Sui. Create a slot, bid/lock with SUI, upload a creative, and render it on any site via a tiny SDK.

## Quickstart

1) Setup
- Copy `.env.example` → `.env` and fill RPC + keys.
- Deploy Move package: `pnpm deploy:contracts`
  - Copy printed `SUI_PACKAGE_ID` (and `SUI_PROTOCOL_ID` if shown) into `.env`.

2) Run
- Install: `pnpm i`
- Dev all: `pnpm dev` (indexer + SDK build:watch + admin + demos)
  - Admin: http://localhost:5173
  - Publisher demo: http://localhost:5174
  - Blog demo: http://localhost:5175 (supports `?slotId=0x...` etc.)

Flow: Create slot → Purchase (bid/lock) with SUI → Upload/Anchor creative → See it live in demos. Completed modals include quick links.

## Packages

- `contracts/sui-ads`: Move module `ad_market` (slots, bids/locks, protocol accounting, cancel/reset; hackathon‑simplified AQT/swap).
- `indexer`: Express API + SQLite + Sui event poller (Prisma). Exposes `/api/slot/:id/*`, wallet overview, finance, mock uploads.
- `packages/sdk`: Browser SDK (UMD/ESM). `window.Aquads.mount('#slot', { slotId })`. Supports `data-responsive` and rotating creatives.
- `apps/admin`: React admin (Create/Purchase/Lock/Cancel/Reset, finance hints). `/swap` for SUI→AQT mock swap & deposit.
- `apps/publisher-demo`, `apps/demo-blog`: Vanilla demos embedding SDK.

## SDK usage

```html
<script src="/sdk/aquads.umd.js"></script>
<div id="slot" data-slot-id="0x..." data-responsive></div>
<script>window.Aquads.mount('#slot', { slotId: '0x...' })</script>
```

## Notes & Fees

- SUI‑only payments. Protocol fee 6% (hackathon): 4% protocol vault, 2% simulated AQT burn (SUI pool accrual). Legacy `bid` path pays publisher directly.
- Mock storage: uploads live in `indexer/uploads/` (`mock://sha256-...`); blog/publisher demos serve them via `/uploads/*`.
- Blog page accepts `?slotId=0x...` (and `banner/rect/slot/slot2` aliases). Toolbar allows saving IDs to localStorage.

## Env

- `SUI_PACKAGE_ID` (required), `SUI_PROTOCOL_ID` (optional but enables fee accounting), `SUI_NETWORK` (default `testnet`).
