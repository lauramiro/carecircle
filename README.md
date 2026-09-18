# CareCircle

Caregiving coordination platform — **MSSE Capstone 2026** (Quantic School of Business and Technology)

CareCircle helps families coordinate medication schedules, daily checklists, handover journals, appointments, wellbeing check-ins, and emergency contacts for a loved one receiving care at home.

## Live application

| Service | URL |
|---------|-----|
| Frontend | https://carecircle-frontend.onrender.com |
| Backend API | https://carecircle-backend-v3j7.onrender.com |

## Project links

| Resource | Link |
|----------|------|
| Task board (Jira) | https://obinnaezedei.atlassian.net/jira/software/projects/CC/boards/2 |
| Design & Testing document | [Design.md](./Design.md) |
| Repository | https://github.com/lauramiro/carecircle |

## Repository structure

```
carecircle/
├── frontend/          # React 19 SPA (Vite + TypeScript + Tailwind)
├── backend/           # NestJS 11 REST API
├── supabase/          # Database migrations, seeds, local Supabase config
├── e2e/               # Playwright API smoke tests
├── .github/workflows/ # CI (lint, test, build on every PR)
├── Design.md          # Capstone design & testing write-up
└── CLAUDE.md          # Developer quick-reference for agents and contributors
```

## Tech stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, React Router v7 |
| Backend | NestJS 11, TypeScript, class-validator, Vitest |
| Database | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Deployment | Render (frontend + backend), Supabase Cloud (database) |
| Integrations | Groq (AI Q&A), Brevo (email), Twilio (SMS), Firebase (push) |

## Prerequisites

- Node.js 20+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local database work)
- Docker (required by Supabase local stack)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/lauramiro/carecircle.git
cd carecircle

cd frontend && npm install
cd ../backend && npm install
```

### 2. Environment variables

**Frontend** — copy and fill in `frontend/.env` from the example:

```bash
cp frontend/.env.example frontend/.env
```

Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. See `frontend/.env.example` for Firebase push keys.

**Backend** — copy and fill in `backend/.env.development`:

```bash
cp backend/.env.example backend/.env.development
```

Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. See [backend/README.md](./backend/README.md) for the full variable list.

Never commit real `.env` files.

### 3. Run locally

In two terminals:

```bash
# Terminal 1 — API (http://localhost:3000)
cd backend && npm run start:dev

# Terminal 2 — SPA (http://localhost:5173, proxies /api → :3000)
cd frontend && npm run dev
```

### 4. Supabase (optional local database)

Run from the **repository root**:

```bash
npx supabase start
npx supabase db reset
npx supabase gen types typescript --local --schema public > frontend/src/lib/database.types.ts
```

## Testing

Run `npm ci` in both `frontend/` and `backend/` before tests to ensure lockfile dependencies (e.g. `firebase-admin`) are installed.

```bash
# Frontend unit tests
cd frontend && npm test

# Backend unit tests
cd backend && npm test

# Backend e2e
cd backend && npm run test:e2e

# Lint
cd frontend && npm run lint
cd backend && npm run lint
```

### CI/CD pipelines

| Pipeline | Workflow | Purpose |
|----------|----------|---------|
| CI | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | Lint, typecheck, unit/integration tests, build (frontend + backend) on every PR |
| E2E | [`.github/workflows/e2e.yml`](./.github/workflows/e2e.yml) | Playwright API smoke tests against deployed backend |
| Deploy | [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) | Render deploy hooks after CI + E2E succeed on `main` |

CI runs lint, typecheck, and tests on every pull request via GitHub Actions.

## Documentation

| Document | Purpose |
|----------|---------|
| [Design.md](./Design.md) | Architecture, patterns, deployment, security, and testing strategy (capstone submission) |
| [backend/README.md](./backend/README.md) | API modules, environment variables, CORS, cron jobs |
| [frontend/README.md](./frontend/README.md) | Frontend structure, path aliases, and dev workflow |
| [CLAUDE.md](./CLAUDE.md) | Engineering conventions and definition of done |

## Team and contributions

Built by a five-person capstone team: [@specialobyno](https://github.com/specialobyno), [@lauramiro](https://github.com/lauramiro), [@tech-broker](https://github.com/tech-broker), [@Wendyshiro](https://github.com/Wendyshiro), [@Peter5793](https://github.com/Peter5793) and [@emmaserunjogi-debug](https://github.com/emmaserunjogi-debug). Teammates are welcome to add their own areas below.

### Areas owned by @lauramiro

Repository owner. Work spans the React frontend, NestJS backend, Supabase migrations and CI.

- **Project bootstrap:** initialised the monorepo (React frontend, NestJS backend) and the first CI pipeline.
- **Auth and accounts:** signup and login with Supabase email and magic-link auth, session persistence and logout across devices, auth unit tests, and a later security pass that hardened the auth flow and closed a `profiles` RLS gap.
- **Medications (end to end):** add-medication form, pause/activate/archive actions, immutable versioning of medication records, duplicate-name warning, active schedule view for group members, stock-level tracking with checklist-driven decrement and low-supply alerts, medication status widget, and unit tests.
- **Appointments (end to end):** create and manage appointments, calendar views, recurring appointments, push reminders, and cancel rules for past appointments.
- **Hospital summary PDF and documents:** emergency-contacts section in the PDF, document download, share and flag-for-summary flow, parallelised flagged-document image downloads, and watermark and footer layout fixes.
- **Dashboard:** next-appointment, journal-snippet and AI-insight widgets; weekly insight fixes; a dev reminders controller for testing scheduled jobs.
- **Row-level security:** closed RLS gaps that blocked group and medication-log visibility and medication writes.
- **CI/CD and delivery:** fixed TypeScript build failures blocking CI, the Render build configuration, `tsconfig.build.json` scoping, and the Epic 4 CI/CD, security and documentation work.
- **Accessibility and UI polish:** font-size toggle, primary-action contrast fix, and sidebar and role-badge layout fixes.

## License

Academic capstone project — not licensed for commercial use.
