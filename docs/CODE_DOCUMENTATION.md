# CareCircle — Code documentation index

This file maps the repository for capstone reviewers and new contributors. For setup and live URLs, start with the [root README](../README.md).

## Package documentation

| Package | README | What it covers |
|---------|--------|----------------|
| Monorepo | [README.md](../README.md) | Live app, setup, testing, project links |
| Frontend | [frontend/README.md](../frontend/README.md) | SPA structure, data paths, path aliases |
| Backend | [backend/README.md](../backend/README.md) | NestJS modules, env vars, CORS, crons |
| Design & testing | [Design.md](../Design.md) | Architecture, patterns, deployment, test strategy |

## Backend module map

NestJS features live under `backend/src/` as one module per domain:

| Module | Route prefix | Responsibility |
|--------|--------------|----------------|
| `medications/` | `/api/medications` | Add, edit, pause, archive medications |
| `checklist/` | — (cron services) | Materialize checklist rows, overdue detection |
| `alerts/` | `/api/push` | Web Push subscriptions and VAPID |
| `insights/` | `/api/insights` | Weekly AI insight cards |
| `ai/` | `/api/ai` | AI Q&A chat |
| `hospital-summary/` | `/api/hospital-summary` | PDF hospital summary generation |
| `shifts/` | `/api/shifts` | Weekly shift assignments |
| `invites/` | `/api/invites` | Group invite emails |
| `cron/` | — | Scheduled jobs (materialization, overdue, SMS) |

Cross-cutting wiring is in `AppModule`: global validation pipe, CORS, logging, rate limiting.

Repositories under `backend/src/integrations/repositories/` are the only layer that calls `SupabaseAdminClient` (service-role key).

## Database

- Migrations: `supabase/migrations/`
- RLS policies govern frontend anon-key access; backend bypasses RLS via service role
- Regenerate frontend types after any schema change (see root README)

## CI/CD

`.github/workflows/` runs lint, test, and build for both packages on every pull request.

## Engineering conventions

See [CLAUDE.md](../CLAUDE.md) for agent-oriented conventions: DTO validation, definition of done, Supabase commands, and gotchas.
