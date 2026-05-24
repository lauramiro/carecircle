# CareCircle

Caregiving coordination platform — MSSE Capstone 2026

## Project Structure

- `frontend/` — React (Vite + TypeScript + Tailwind CSS)
- `backend/` — NestJS API
- `.github/workflows/` — CI/CD pipeline (GitHub Actions)

## Links

- Deployed app: _coming Sprint 1_
- Task board: _add your Trello link here_
- Design & Testing doc: _coming Sprint 4_

## Setup

### Frontend
cd frontend
npm install
npm run dev

### Backend
cd backend
npm install
npm run start:dev

### Supabase
Run Supabase commands from the app root:

cd carecircle

Local project files live in `supabase/`.
Frontend database types are generated into `frontend/src/lib/database.types.ts`.

Common commands:

Create a migration:
`npx supabase migration new <name>`

Start local Supabase:
`npx supabase start`

Apply local migrations:
`npx supabase db reset`

Generate frontend types from the local database:
`npx supabase gen types typescript --local --schema public > frontend/src/lib/database.types.ts`