# CareCircle Frontend

React 19 single-page application for the CareCircle caregiving platform. Built with Vite, TypeScript, and Tailwind CSS.

## Quick start

```bash
npm install
cp .env.example .env   # fill VITE_SUPABASE_* and optional Firebase keys
npm run dev            # http://localhost:5173
```

The dev server proxies `/api` requests to the NestJS backend at `http://localhost:3000`.

## Source layout

```
src/
├── api/              # Data access per feature (services, types, mappers)
├── components/       # Reusable UI (feature folders + shared ui/)
├── contexts/         # Global React context (Auth, Theme, FontSize)
├── hooks/            # Feature hooks (data fetching, form state, realtime)
├── lib/              # Shared utilities (Supabase client, dates, permissions)
├── pages/            # Route-level screens (one folder per area)
├── utils/            # Pure helpers (formatting, filters)
├── test/             # Shared test utilities and mocks
└── main.tsx          # App entry — router, providers, global styles
```

### Feature modules (`src/api/`)

Each domain keeps its own folder:

| Folder | Responsibility |
|--------|----------------|
| `medications/` | Medication CRUD via backend `/api/medications` |
| `checklist/` | Checklist reads (Supabase) and mark-given/skip mutations |
| `groups/` | Care groups, members, GP contacts, emergency contacts |
| `appointments/` | Appointment scheduling |
| `journal/` | Handover journal entries |
| `administrationLog/` | Medication administration history |
| `insights/` | AI-generated weekly insights (backend API) |
| `ai/` | AI Q&A chat (backend API) |

### Pages (`src/pages/`)

Route components map to URLs defined in `src/App.tsx`. Major areas:

- `groups/` — care circle list, detail, members, emergency contacts, administration log
- `medications/` — schedule view, add/edit medication
- `checklist/` — daily medication checklist
- `SettingsPage.tsx` — theme, notifications, profile phone number

## Architecture patterns

### Two data paths

1. **Backend API** (`apiFetch` / feature services) — writes and business logic hit NestJS at `/api/...`. Used for medication mutations, insights, push registration, AI chat, shifts.
2. **Direct Supabase** (`src/lib/supabaseClient.ts`) — anon-key client for RLS-governed reads and realtime subscriptions (checklist items, group members, profiles).

Auth is handled entirely in the frontend via Supabase Auth (`AuthContext`). The backend does not validate JWTs on regular routes.

### State management

No Redux or Zustand. State lives in:

- `AuthContext` — session
- Feature hooks (`useMedications`, `useGroupDetail`, `useAdministrationLog`, etc.)
- Local component state for forms and modals

### Path aliases

Defined in `vite.config.ts` — prefer these over deep relative imports:

| Alias | Path |
|-------|------|
| `@api` | `src/api` |
| `@components` | `src/components` |
| `@hooks` | `src/hooks` |
| `@lib` | `src/lib` |
| `@pages` | `src/pages` |
| `@utils` | `src/utils` |
| `@typings` | `src/typings` |

## Environment variables

See `.env.example`. All frontend env vars must be prefixed `VITE_`.

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (RLS-governed reads) |
| `VITE_API_BASE_URL` | Backend base URL in production (Render) |
| `VITE_FIREBASE_*` | Firebase Web SDK keys for push notifications |

Never put the Supabase **service-role** key in the frontend.

## Generated files

`src/lib/database.types.ts` is **codegen only** — regenerate after schema migrations:

```bash
# from repository root
npx supabase gen types typescript --local --schema public > frontend/src/lib/database.types.ts
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm test` | Run Vitest unit tests |
| `npm run lint` | ESLint with auto-fix |
| `npx tsc -b --noEmit` | Typecheck without emit |

## Testing

Tests use Vitest + React Testing Library. Co-locate tests as `*.test.ts(x)` next to the module under test, or in `src/test/` for integration scenarios.

Run a single file:

```bash
npx vitest run src/hooks/medications/useMedicationForm.test.ts
```

## Further reading

- [Root README](../README.md) — monorepo setup and live URLs
- [Design.md](../Design.md) — capstone architecture and testing document
- [backend/README.md](../backend/README.md) — API modules and environment variables
