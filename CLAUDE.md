# CareCircle — Engineering Notes

Caregiving coordination platform. Monorepo, no workspace manager (no pnpm/turbo/nx) — `backend/` (NestJS) and `frontend/` (React+Vite) are standalone npm packages sharing only `supabase/migrations/`.

## Commands

All commands assume you've `cd`'d into the named directory.

### Install
```
cd backend && npm install
cd frontend && npm install
```

### Run
```
cd backend && npm run start:dev      # NestJS, watch mode, http://localhost:3000
cd frontend && npm run dev           # Vite, http://localhost:5173, proxies /api -> :3000
```

### Test — single test
Both packages use vitest. To run one file:
```
cd backend && npx vitest run src/medications/medications.service.spec.ts
cd frontend && npx vitest run src/api/medications/medications.service.test.ts
```
To run one test by name (any package):
```
npx vitest run -t "test name substring" path/to/file.spec.ts
```
Full suite: `npm test` (backend or frontend). Backend e2e: `npm run test:e2e` (backend only, separate vitest config).

### Lint
```
cd backend && npm run lint     # eslint --fix over src/apps/libs/test
cd frontend && npm run lint    # eslint .
```

### Typecheck
Neither package has a dedicated `typecheck` script — use `tsc` directly:
```
cd backend && npx tsc -p tsconfig.json --noEmit
cd frontend && npx tsc -b --noEmit
```
(Frontend's real `build` script runs `tsc -b && vite build`, so a failing typecheck fails the build too.)

### Supabase migrations
Run from repo root (`carecircle/`), not from `frontend/` or `backend/`:
```
npx supabase migration new <name>            # create a new migration file under supabase/migrations/
npx supabase start                           # start local Supabase stack
npx supabase db reset                        # apply all local migrations from scratch
npx supabase gen types typescript --local --schema public > frontend/src/lib/database.types.ts
```
Always regenerate `database.types.ts` after any migration that changes schema.

## Architecture overview

- **Backend** (`backend/src/`): NestJS, feature-per-module (`medications/`, `checklist/`, `alerts/`, `insights/`, `shifts/`, `reminders/`, `document-storage/`, `sms/`, `ai/`, `hospital-summary/`, `cron/`, etc.). Routes are prefixed `/api/...`.
  - Flow: Controller (DTO + `class-validator`) → Service (business logic) → Repository (`backend/src/integrations/repositories/*`) → `SupabaseAdminClient`.
  - `SupabaseAdminClient` (`backend/src/integrations/supabase-admin.client.ts`) uses the **service-role key** — every backend DB call bypasses RLS.
  - Global cross-cutting concerns wired in `AppModule`: `HttpExceptionFilter`, `LoggingInterceptor`, `TraceContextInterceptor`, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).
  - `DevOnlyGuard` gates `/api/dev/*` debug routes (404s outside `NODE_ENV=development`). No other auth guard exists on regular routes — see Gotchas.
- **Frontend** (`frontend/src/`): React 19 + Vite + React Router v7 + Tailwind. No Redux/Zustand — state via `AuthContext` + custom hooks per feature (`src/api/<feature>/`).
  - Two distinct data paths: (1) `apiFetch` wrapper hits backend `/api/...` for writes/business logic; (2) direct `supabase-js` (anon key, `src/lib/supabaseClient.ts`) for reads/realtime subscriptions — these are RLS-governed.
  - Auth: Supabase Auth directly in the frontend (`supabase.auth.signInWithPassword`, session in `AuthContext`). Backend never validates the caller's JWT.
- **Database**: Supabase/Postgres, migrations in `supabase/migrations/`. Most tables have RLS policies (e.g. `is_group_member()`), but RLS only matters for the frontend's direct anon-key queries — the backend's service-role client bypasses it entirely.

## Conventions

- DTOs use `class-validator` decorators; global pipe strips unknown fields and rejects extras (`forbidNonWhitelisted`) — don't add fields to a request body without a matching DTO property.
- Repositories are the only layer that touches `supabase-admin.client.ts` directly; services should not call Supabase directly.
- Frontend path aliases (`@api`, `@components`, `@config`, `@constants`, `@contexts`, `@hooks`, `@lib`, `@pages`, `@services`, `@test`, `@utils`, `@typings`) are defined in `vite.config.ts` — use them instead of relative `../../..` imports.

## Gotchas

- **`frontend/src/lib/database.types.ts` is generated** by `supabase gen types typescript` (no header warning is present in the file itself, but treat it as codegen-only). Never hand-edit it — regenerate after migrations instead.
- **RLS is meaningless for backend-mediated changes.** The backend always uses the service-role key, so adding/relying on an RLS policy does not protect any data reached through `/api/...` routes. Known/accepted limitation — don't "fix" it unprompted.
- `backend/.env` holds live credentials in the working tree — don't print its contents into chat/logs, don't commit changes that touch it.
- `npx supabase` commands must run from repo root, not `frontend/` or `backend/` (the CLI is a frontend devDependency but operates on `supabase/` at the root).
- Frontend `frontend/.env.example` only lists `VITE_*` vars (anon key) — never put the service-role key there.

## Definition of done

Before considering any backend or frontend change complete:

1. `npm run lint` passes in the package(s) you touched.
2. `npx tsc -p tsconfig.json --noEmit` (backend) / `npx tsc -b --noEmit` (frontend) passes with no errors.
3. Relevant tests pass: at minimum the file(s) you changed and any spec that imports them (`npx vitest run <file>`); run the full `npm test` if the change touches shared code (repositories, DTOs, hooks used across features).
4. If you changed the DB schema: a new migration exists under `supabase/migrations/`, `npx supabase db reset` applies cleanly, and `database.types.ts` has been regenerated and committed.
5. If you added/changed a backend route: confirm whether it needs a DTO + validation, and whether it should sit behind `DevOnlyGuard` (only for dev-only debug endpoints).
