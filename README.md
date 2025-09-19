# Aquads (MVP)

End-to-end demo: Ad NFT slot creation → bid/lock → creative upload/anchor → SDK render on publisher page.

## Quickstart

- Copy `.env.example` to `.env` and fill keys.
- Deploy contracts: `pnpm deploy:contracts` then set `SUI_PACKAGE_ID` in `.env`.
- Start indexer/API: `pnpm dev:indexer`.
- In another terminal: `pnpm --filter @aquads/sdk build:watch`.
- Start admin: `pnpm --filter @aquads/admin dev`.
- Start publisher demo: `pnpm --filter @aquads/publisher-demo dev`.

Flow: Create slot → Bid/Lock → Upload creative (Walrus or mock) → Anchor → See image swap live in publisher demo.

## Packages

- `contracts/sui-ads`: Move module `ad_market` with events.
- `indexer`: Express API + Sui RPC subscriber + SQLite (Prisma schema).
- `packages/sdk`: Aquads browser SDK (UMD + ESM) to mount ad slots.
- `packages/shared`: Shared types.
- `apps/admin`: Vite + React dashboard.
- `apps/publisher-demo`: Vanilla demo page embedding SDK.

## Notes

- Walrus can be mocked: server stores files in `indexer/uploads/` and returns `mock://sha256-<hash>`.
- Seal is mocked via simple sign/verify utils; SDK can bypass verification when toggled.
- Protocol fee set to 200 bps; immediate publisher payout.
