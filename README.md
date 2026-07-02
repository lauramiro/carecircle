# CareCircle

CareCircle is a caregiving coordination platform built for the MSSE Capstone 2026 project. It helps a care team coordinate around a patient through shared groups, medication schedules, daily checklists, appointments, journal entries, AI-assisted insights, reminders, and hospital handover summaries.

The repository is intentionally split into a React frontend, a NestJS backend, and Supabase database assets so each layer has a clear ownership boundary.

## Project Links

- Deployed app: _add Render/frontend production URL before final demo_
- Design & Testing document: [Design.md](./Design.md)
- Story 124 documentation evidence: [story-124-documentation.md](./story-124-documentation.md)
- Trello board: _add team Trello board URL before final demo_

## Repository Layout

```text
.
├── frontend/              # React 19 + Vite + TypeScript app
├── backend/               # NestJS API, crons, integrations, and server-only workflows
├── supabase/              # Supabase config, migrations, generated DB types, seed data
├── Design.md              # Product/design notes
└── ai-test-results.md     # AI QA testing notes
```

## Product Capabilities

- **Care groups:** create and manage care circles around a patient.
- **Patient profile:** track demographics, conditions, allergies, GP contacts, and care metadata.
- **Medication management:** create medication schedules, pause/reactivate/archive medicines, and materialize checklist items.
- **Daily checklist:** record given/skipped/overdue medication events and proof metadata.
- **Appointments:** schedule care appointments with reminder offsets and recurring-series support.
- **Journal and administration log:** capture care notes and audit care activity.
- **Alerts and reminders:** send push/SMS/email notifications for overdue medication and appointment reminders.
- **AI assistant and insights:** answer care-profile questions and generate weekly digest cards from care data.
- **Hospital summary:** assemble and render a downloadable PDF for clinical handover.

## Architecture

### Frontend

The frontend is a Vite React app that uses Supabase Auth directly for session management and calls the backend for server-only operations such as AI, email, SMS, push dispatch, medication write workflows, and PDF generation.

Important frontend locations:

- `frontend/src/App.tsx` - route map and authenticated shell.
- `frontend/src/contexts/AuthContext.tsx` - Supabase session state.
- `frontend/src/api/` - browser-facing API clients and type definitions.
- `frontend/src/hooks/` - workflow state and Supabase realtime hooks.
- `frontend/src/components/` - reusable UI and domain widgets.
- `frontend/src/pages/` - routed screens.
- `frontend/src/lib/database.types.ts` - generated Supabase public schema types.

### Backend

The backend is a NestJS API mounted under `/api`. It owns server-side credentials, third-party integrations, scheduled work, structured logging, validation, and cross-cutting request behavior.

Important backend locations:

- `backend/src/app.module.ts` - module composition and global filters/interceptors.
- `backend/src/main.ts` - bootstrap, env loading, CORS, API prefix, validation.
- `backend/src/config/` - Zod-backed configuration and CORS policy.
- `backend/src/integrations/` - Supabase admin client and repositories.
- `backend/src/checklist/` - checklist materialization and overdue detection.
- `backend/src/alerts/` - push subscriptions and push/SMS alert dispatch.
- `backend/src/reminders/` - appointment reminder checks.
- `backend/src/insights/` - AI weekly digests and rule-based insight generation.
- `backend/src/hospital-summary/` - handover summary assembly and PDF generation.

### Supabase

Supabase provides auth, Postgres, row-level security, storage, and realtime. Migrations live in `supabase/migrations/`; generated type snapshots are committed for frontend and schema review.

The backend uses the service-role key only for trusted server workflows that must bypass RLS, such as crons and alert dispatch. The frontend must only use the anon key.

## Backend API Surface

All routes are prefixed with `/api`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/` | Lightweight API smoke check. |
| `POST` | `/api/ai/qa` | Ask the AI assistant a question grounded in a group care profile. |
| `GET` | `/api/push/vapid-public-key` | Return the browser push public key, or `null` when push is disabled. |
| `POST` | `/api/push/subscriptions` | Upsert a user push subscription. |
| `DELETE` | `/api/push/subscriptions/:id` | Delete a user-owned push subscription. |
| `POST` | `/api/groups/:groupId/medications` | Create a medication schedule. |
| `PATCH` | `/api/groups/:groupId/medications/:medicationId` | Update medication details/schedule. |
| `POST` | `/api/groups/:groupId/medications/:medicationId/pause` | Pause a medication. |
| `POST` | `/api/groups/:groupId/medications/:medicationId/activate` | Reactivate a medication. |
| `POST` | `/api/groups/:groupId/medications/:medicationId/archive` | Archive a medication while preserving history. |
| `GET` | `/api/insights/:groupId/latest?userId=...` | Latest weekly digest, excluding cards dismissed by that user. |
| `GET` | `/api/insights/:groupId/archive` | Historical digests excluding the latest. |
| `POST` | `/api/insights/cards/:cardId/dismiss` | Dismiss an insight card for one user. |
| `POST` | `/api/insights/debug/generate/:groupId` | Manually generate a digest for development/admin workflows. |
| `GET` | `/api/insights/group/:groupId` | Fetch active rule-based AI insights for a group-owned patient. |
| `POST` | `/api/invites/group/send-email` | Send the server-side email for a group invite. |
| `POST` | `/api/hospital-summary/generate-pdf` | Generate a downloadable hospital summary PDF. |
| `POST` | `/api/hospital-summary/assemble` | Return the normalized hospital summary payload without PDF rendering. |
| `POST` | `/api/dev/push/test` | Development-only push connectivity test. |
| `POST` | `/api/dev/sms/test` | Development-only SMS connectivity test. |
| `POST` | `/api/dev/reminders/run` | Development-only manual appointment reminder check. |

Every route handler is documented with JSDoc/docstring comments in its controller. Those comments explain request intent, ownership boundaries, and why the controller does or does not perform specific work.

## Background Jobs

Nest schedule jobs are grouped under `backend/src/cron` and feature modules:

- Checklist materialization extends future medication checklist items.
- Horizon checks keep perpetual medications materialized ahead of time.
- Overdue detection identifies due checklist items and queues alerts.
- SMS dispatch sends fallback SMS after the configured push grace period.
- Appointment reminders evaluate 24-hour and 1-hour reminder windows.
- Weekly digest generation produces AI insight cards for care groups.
- Rule-based weekly insight generation stores patient-level insight observations.

Set `CRON_ENABLED=false` locally when you want to run the API without background side effects.

## Environment Variables

Create local env files from examples where available:

```bash
cp backend/.env.example backend/.env
```

The backend validates env at startup with Zod. Required values include:

- `NODE_ENV`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GROQ_API_KEY`

Common optional server-only values:

- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_PUBLIC_URL`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_ENABLED`
- `SMS_FALLBACK_DELAY_MINUTES`
- `MATERIALIZATION_BATCH_SIZE`

The frontend uses `VITE_` variables such as:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never commit real `.env` files or service-role/API keys.

## Local Development

Install dependencies:

```bash
cd frontend && npm install
cd ../backend && npm install
```

Run the frontend:

```bash
cd frontend
npm run dev
```

Run the backend:

```bash
cd backend
npm run start:dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:<PORT>/api`
- Local Supabase API, when started: `http://127.0.0.1:54321`

## Supabase Workflow

Run Supabase commands from the repository root unless a command explicitly says otherwise.

Create a migration:

```bash
npx supabase migration new <name>
```

Start local Supabase:

```bash
npx supabase start
```

Apply migrations and seed locally:

```bash
npx supabase db reset
```

Generate frontend database types:

```bash
npx supabase gen types typescript --local --schema public > frontend/src/lib/database.types.ts
```

When using the project-local Supabase CLI package from `frontend/node_modules`, run:

```bash
HOME=/private/tmp XDG_CONFIG_HOME=/private/tmp frontend/node_modules/.bin/supabase <command>
```

This avoids CLI telemetry writes to restricted home directories in sandboxed environments.

## Quality Gates

Frontend:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Backend:

```bash
cd backend
npm run build
npm run test
npm run test:e2e
```

Use focused test runs while iterating:

```bash
cd backend
npm test -- --run src/cron/cron.jobs.spec.ts

cd frontend
npm test -- --run src/pages/LoginPage.test.tsx
```

## Engineering Decisions

- **HTTP routes stay thin.** Controllers validate route/body shape, explain route intent, and delegate domain behavior to services.
- **Server-only side effects live in the backend.** AI, email, SMS, push dispatch, PDF generation, and service-role Supabase writes are never performed directly from the browser.
- **Group IDs are the browser boundary.** Several endpoints resolve patient IDs server-side from group IDs so clients do not need raw internal patient IDs.
- **Historical care data is preserved.** Medication archive/pause flows use state transitions instead of destructive deletes.
- **Crons are idempotent.** Reminder offsets and alert lifecycle records prevent duplicate dispatch when jobs restart or overlap.
- **Generated data is grounded.** AI prompts instruct providers to use only supplied care data and return constrained JSON for downstream UI.
- **Observability is built in.** Structured logging, trace IDs, and global exception handling make API behavior inspectable during development and production debugging.

## Documentation Pointers

- Backend-specific setup and cross-cutting API behavior: `backend/README.md`
- Supabase schema and migrations: `supabase/migrations/`
- Design & Testing architecture, technology choices, patterns, deployment, RLS, and testing notes: `Design.md`
- Story 124 README/API documentation acceptance evidence: `story-124-documentation.md`
- AI testing notes: `ai-test-results.md`
