# CareCircle Backend

NestJS API service for CareCircle. The backend is responsible for serving HTTP APIs under a consistent `/api` prefix and provides shared application-level safeguards for configuration, request validation, CORS, and rate limiting.

## Tech Stack

- NestJS
- TypeScript
- Vitest
- Zod
- `@nestjs/config`
- `@nestjs/throttler`
- `class-validator` and `class-transformer`

## Environment Setup

The backend loads environment variables through `@nestjs/config` with variable expansion enabled.

Environment files are loaded in this priority order:

1. `.env.${NODE_ENV}`
2. `.env`

For local development, create:

```bash
cp .env.example .env.development
```

For production, provide the same required variables through the deployment environment or a non-committed `backend/.env.production` file.

Never commit real `.env`, `.env.development`, or `.env.production` files.

## Required Environment Variables

| Variable | Required | Values | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | `development`, `production`, `test` | Runtime environment. Used for env file priority and environment-specific behavior. |
| `PORT` | Yes | `1`-`65535` | Port the NestJS HTTP server listens on. |
| `SUPABASE_URL` | Yes | URL | Supabase project URL (Dashboard → Settings → API). |
| `SUPABASE_ANON_KEY` | Yes | string | Supabase **anon** (public) key — safe for the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | No* | string | **Server-only.** Required for checklist materialization, overdue detection, and alert crons (bypasses RLS). **Never expose to clients or commit.** |
| `FRONTEND_PUBLIC_URL` | No | URL | Base URL for push/SMS deep links (e.g. `http://localhost:5173`). |
| `VAPID_PUBLIC_KEY` | No | string | Web Push public key. Generate: `npx web-push generate-vapid-keys` (from `backend/`). |
| `VAPID_PRIVATE_KEY` | No | string | Web Push private key — **server only, never commit.** |
| `VAPID_SUBJECT` | No | string | `mailto:…` or `https://…` contact for push services. |
| `CRON_ENABLED` | No | `true` / `false` | Set `false` to disable Nest schedule crons (tests). Default: enabled. |
| `SMS_FALLBACK_DELAY_MINUTES` | No | `1`–`60` | Minutes after push before SMS fallback (default `10`). |
| `MATERIALIZATION_BATCH_SIZE` | No | `1`–`500` | Max checklist rows inserted per batch (default `100`). |
| `TWILIO_ACCOUNT_SID` | No | string | Twilio Account SID. **Never commit.** Required to send SMS. |
| `TWILIO_AUTH_TOKEN` | No | string | Twilio Auth Token. **Never commit.** |
| `TWILIO_FROM_NUMBER` | No | E.164 | Sender number registered with Twilio (e.g. `+15551234567`). |
| `TWILIO_DEV_TEST_TO_NUMBER` | No | E.164 | Default recipient for `POST /api/dev/sms/test` in `development` only. |

\*Strongly recommended before enabling alert crons; optional until then for local API-only work.

**Supabase keys:** Use **anon** in the frontend only. The backend crons and `SupabaseAdminService` use **service role** for writes to `checklist_items`, `missed_medications_alert`, etc. Legacy env name `SUPABASE_SERVICE_KEY` is still accepted once at bootstrap (mapped to `SUPABASE_SERVICE_ROLE_KEY`); prefer the role key name in new `.env` files.

**VAPID:** Install `web-push` if needed (`npm install web-push`), then run `npx web-push generate-vapid-keys`. Put the public key in backend env and expose the same public key to the frontend for `pushManager.subscribe`.

**Twilio (CC-100):** Store credentials only in environment variables or your secrets manager. The dev-only endpoint `POST /api/dev/sms/test` sends a generic connectivity message (no patient or medication content). Profile phone numbers should be E.164 (see `src/common/validation/e164.ts`).

**Alerts pipeline:** Full design is in [`medication_schedule_checklist_push_notification_sms_alert_design.md`](../medication_schedule_checklist_push_notification_sms_alert_design.md) at the repo root.

Environment validation is defined in `src/config/env.schema.ts` using Zod. If any required variable is missing or invalid, the app throws during bootstrap and refuses to start.

Use `AppConfigService` when reading configuration in application code:

```ts
const port = this.appConfigService.config.PORT;
```

This keeps config access typed and gives TypeScript intellisense for supported config keys.

## Running The App

Install dependencies:

```bash
npm install
```

Start in development mode:

```bash
npm run start:dev
```

Build for production:

```bash
npm run build
```

Run the compiled app:

```bash
npm run start:prod
```

## Testing

Run unit tests:

```bash
npm run test
```

Run e2e tests:

```bash
npm run test:e2e
```

Run coverage:

```bash
npm run test:cov
```

## Global API Conventions

### API Prefix

All HTTP routes are prefixed with:

```text
/api
```

For example, a controller route declared as `@Get()` is served at `/api`.

### CORS

CORS is configured during bootstrap:

- `development`: allows `http://localhost:*`
- `production`: allows `https://carecircle.com`

### Rate Limiting

Global throttling is enabled with `@nestjs/throttler`:

```text
100 requests per 60 seconds
```

The throttler is registered globally through `APP_GUARD`.

### Validation

Global request validation is enabled with:

```ts
whitelist: true
forbidNonWhitelisted: true
transform: true
```

This means DTOs should explicitly define accepted fields, unknown fields are rejected, and payload values are transformed into DTO types where possible.

### Structured Logging

Application logs are emitted as structured JSON through the global logger module. Each log entry includes:

- `timestamp`
- `level`
- `context`
- `message`
- `traceId`
- any extra metadata passed by the caller

Use a context-specific logger token in services and controllers:

```ts
import { Inject } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';

constructor(
  @Inject(AppController.name)
  private readonly logger: LoggerService,
) {}

someMethod() {
  this.logger.log('Doing something', { userId: '123' });
}
```

Example output:

```json
{
  "timestamp": "2026-04-30T11:00:00.000Z",
  "level": "info",
  "context": "AppController",
  "traceId": "3f3e2c66-3772-40b0-8ef9-7afcd1f3f3e2",
  "message": "Doing something",
  "userId": "123"
}
```

### Distributed Tracing

Each request gets a trace ID stored in `AsyncLocalStorage` for the lifetime of the request.

Incoming request header priority:

1. `x-trace-id`
2. `x-request-id`
3. generated UUID v4 fallback

The backend always echoes the active trace ID in the response:

```text
x-trace-id: <trace-id>
```

`TraceContextService` is exported from `TraceContextModule` and can be injected wherever a trace ID is needed, such as outbound HTTP clients:

```ts
const traceId = this.traceContextService.getTraceId();
```

Callers do not need to pass `traceId` into the logger manually. `LoggerService` reads it from async context internally.

### Request And Error Logging

Every HTTP request is logged globally with:

- `method`
- `url`
- `statusCode`
- `durationMs`
- `traceId`

Unhandled exceptions and HTTP exceptions are logged globally with:

- `statusCode`
- `path`
- `message`
- `traceId`
- `stack` in non-production environments

## Useful Scripts

```bash
npm run start:dev   # start in watch mode
npm run build       # compile the app
npm run lint        # run eslint with autofix
npm run test        # run unit tests
npm run test:e2e    # run e2e tests
npm run test:cov    # run unit tests with coverage
```
