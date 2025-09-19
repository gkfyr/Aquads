# Repository Guidelines

## Project Structure & Module Organization
- contracts/sui-ads: Move contracts (Move.toml, sources/).
- indexer: Express API, Sui RPC subscriber, Prisma + SQLite (src/, prisma/).
- packages/sdk: Browser SDK (Rollup build, ESM/UMD outputs).
- packages/sdk-react: React bindings for the SDK.
- packages/shared: Shared TypeScript types.
- apps/admin: Vite + React dashboard.
- apps/publisher-demo, apps/demo-blog: Vite demo apps.
- scripts: Deployment and seed helpers. Config in .env and .env.example.

## Build, Test, and Development Commands
- Root
  - `pnpm dev`: Concurrent dev for indexer, SDK (watch), admin, demos.
  - `pnpm build`: Build all workspaces.
  - `pnpm dev:indexer`: Run API/indexer locally.
  - `pnpm deploy:contracts`: Deploy Move package (reads .env).
  - `pnpm seed`: Seed demo data via API.
- Package-scoped examples
  - `pnpm --filter @aquads/indexer prisma:generate|deploy|migrate|reset`
  - `pnpm --filter @aquads/sdk build[:watch]`
  - `pnpm --filter @aquads/admin dev|build|preview`

## Coding Style & Naming Conventions
- TypeScript: 2-space indent, ES modules, strict types. Prefer named exports.
- React: Components in PascalCase (e.g., `NavBar.tsx`), hooks/use- files in camelCase.
- Node utilities in `indexer/src`: lowercase file names (e.g., `db.ts`, `routes.ts`).
- Move: Follow Sui/Move community style; module names in UpperCamelCase.
- Use Prettier defaults if installed; otherwise match existing formatting.

## Testing Guidelines
- No repo-wide framework yet. For new tests, prefer Vitest.
- Co-locate tests as `*.test.ts[x]` next to sources.
- Minimum bar: `pnpm build` passes across workspaces and the indexer starts without errors.
- Add screenshots for UI changes in PRs; manual smoke on admin and demos.

## Commit & Pull Request Guidelines
- Commits: Imperative, concise subjects. Conventional style encouraged (e.g., `feat:`, `fix:`, `chore:`).
- PRs must include:
  - Clear description and rationale; link issues when applicable.
  - Scope of changes (packages touched) and testing notes.
  - Screenshots/GIFs for UI-visible changes.
  - Any config impacts (`.env` keys, migrations, deployment steps).

## Security & Configuration Tips
- Copy `.env.example` to `.env` and set required keys (e.g., `SUI_PACKAGE_ID`, RPC, DB path). Never commit secrets.
- Prisma uses SQLite by default; run migrations via the indexer package scripts.
- Artifacts and uploads live under `indexer/uploads/` for mock flows—treat as non-sensitive.
