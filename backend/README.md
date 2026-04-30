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

## Useful Scripts

```bash
npm run start:dev   # start in watch mode
npm run build       # compile the app
npm run lint        # run eslint with autofix
npm run test        # run unit tests
npm run test:e2e    # run e2e tests
npm run test:cov    # run unit tests with coverage
```
