# AI Fitness Coach

Next.js 16 / React 19 app for exercise and dance coaching, plans, nutrition, progress, and session evidence. Production beta is gated pending staging services and physical-device validation. Learned posture models are **disabled by default**; current rule indicators are not trained-model probabilities.

## Local setup

Use Node 22 (`nvm use`), npm 10.9.9, Python 3.12+, and PostgreSQL with UTF-8 encoding. `package-lock.json` is the canonical dependency lock.

1. Copy `.env.example` to `.env.local`; configure PostgreSQL and a random Better Auth development secret.
2. Run `npm ci --legacy-peer-deps`.
3. Export `DATABASE_URL` into your shell for the Drizzle CLI (it does not load `.env.local` automatically).
4. Run `npm run db:migrate` and `npm run db:seed`.
5. Run `npm run dev`. Development and production use webpack for consistent compilation.

Local demos require explicit demo flags. Production never accepts demo cookies or database-free saves. Docker Compose is a local development stack; configure managed services for production.

### Containers

`docker compose up --build` starts local PostgreSQL, applies migrations, seeds the movement catalog and starts the development app. Database and app ports bind to loopback only.

The production runner is a separate nonroot standalone image. Supply `NEXT_PUBLIC_APP_URL` (HTTPS) and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` **at build time**. Supply database, Clerk secret, Redis, cron and AI credentials at runtime through your secret manager. Changing public values requires rebuilding.

```sh
docker compose --profile tools run --rm migrate
docker compose --profile production up --build app-production
```

Use explicit service names with production profiles. Do not run local database services against production data. Seed catalog content from a trusted checkout with `npm run db:seed` after migrations; seed tools are intentionally absent from the minimal production runner. Complete the inventory, backup and staging steps in the deployment guide first.

### Current improvements

- A responsive movement study, session journal visual system, self-hosted OFL typography and accessible navigation.
- A real, searchable supported-movement catalog with working deep links. Removed fabricated featured workouts and unsupported dance courses.
- Abortable requests with deadlines, visible errors and retries for recovery, dashboard and catalog. Unsaved recovery edits survive request failures.
- Production Clerk entry routes and return paths, recovery route protection, framing protection and reproducible container builds.
- Removed fabricated battery curves; readiness explicitly identifies missing check-ins and estimated planning data.
- Dependency audit remediated; browser, PostgreSQL and model-pipeline evidence is recorded in the validation report.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run test:ml
npm run db:check
npm run build
```

Database checks require an isolated local database whose name contains `test`, with `TEST_DATABASE_URL` and `DATABASE_URL` pointing to it. Migrate and seed that database first.

```sh
npm run db:verify
npm run test:integration
```

Browser tests: install Chromium with `npx playwright install chromium`. Set `E2E_REAL_DATABASE=true` to exercise actual development authentication, persisted workflows, ownership, export, and deletion against the test database. `npm run test:e2e:prod` runs production public-route and worker-asset smoke tests; it does not validate live Clerk credentials.

## Guides

- [Camera engine v3 validation](docs/camera-engine-validation-2026-10-29.md): tracking, observable fitness scoring, audio-clock dance timing, benchmark input and remaining physical-device evidence.
- [Camera UI review](docs/camera-ui-review-2026-10-29.md): design-law checks and responsive camera fixes.

- [Production deployment and operations](docs/production-beta-runbook.md)
- [Model data, training, and promotion](docs/posture-model-pipeline.md)
- [Release evidence checklist](docs/beta-release-checklist.md)
- [Local validation results](docs/validation-2026-10-15.md)
- [Production hardening evidence](docs/validation-2026-10-29.md)
- [Design law review](docs/ui-review-2026-10-29.md)

Production target: Vercel, Neon PostgreSQL, Clerk, and Upstash. Run inventory and backup before auth migration. No automatic email-based identity linking.
