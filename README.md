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

CI runs lint, typecheck, and tests on every pull request via GitHub Actions.

## Documentation

| Document | Purpose |
|----------|---------|
| [Design.md](./Design.md) | Architecture, patterns, deployment, security, and testing strategy (capstone submission) |
| [backend/README.md](./backend/README.md) | API modules, environment variables, CORS, cron jobs |
| [frontend/README.md](./frontend/README.md) | Frontend structure, path aliases, and dev workflow |
| [CLAUDE.md](./CLAUDE.md) | Engineering conventions and definition of done |

## License

Academic capstone project — not licensed for commercial use.
