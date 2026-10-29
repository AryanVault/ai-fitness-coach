# Production Readiness Implementation Plan

**Goal:** Improve the existing app's reliability, truthful presentation, accessibility and release verification.

**Architecture:** Retain existing services and data contracts. Separate network-state fixes, release configuration and the visual system so each can be verified independently.

**Tech Stack:** Next.js 16, React 19, PostgreSQL, Drizzle, Clerk, Upstash, Motion, Radix, Vitest, Playwright.

**Spec:** `docs/design/specs/2026-10-28-production-readiness-design.md`

## Global constraints

- Preserve data and ownership rules. Do not enable production demos or learned models.
- Follow the user's full design law and point-by-point final review.
- User approved all three passes and explicitly requested proceeding with implementation.
- Do not publish, insert production secrets, migrate live data or claim physical-device validation.

## Review focus

- Failed requests must produce recoverable error states, never infinite spinners.
- Logged-out visits to private routes must redirect; API ownership stays enforced.
- Storage denial and reduced-motion preferences must not break navigation or hide content.
- The UI must remain readable and usable at 375px and desktop widths.
- Production public pages must work without configured private services and without fabricated claims.

## Task 1: Reliability

Files: `src/proxy.ts`, `src/app/dashboard/page.tsx`, `src/app/recovery/page.tsx`, focused browser tests and any focused shared request helper.

- [x] Reproduce missing recovery redirect and failed load/save behavior with targeted tests.
- [x] Add error, retry and finally paths; preserve existing successful response contracts.
- [x] Verify unauthenticated navigation, HTTP errors, rejected fetch and successful retry.

## Task 2: Release configuration

Files: `next.config.ts`, `Dockerfile`, `docker-compose.yml`, `package.json`, lockfile and `.github/workflows/ci.yml` as justified by evidence.

- [x] Inspect dependency audit and deployment build/runtime environment consistency.
- [x] Apply bounded fixes with tests or build checks; never bypass environment gates.
- [x] Verify production build and configuration. Record externally blocked checks honestly.

## Task 3: Movement visual system

Files: `src/app/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/layout/AppLayout.tsx`, new `src/components/brand/` movement/mark components and public font assets.

- [x] Render and select a properly licensed self-hosted display face.
- [x] Build a responsive, working movement study and truthful public content.
- [x] Apply coherent design tokens and shell; accessible controls, safe storage, skip link.
- [x] Replace hidden entrance defaults across app pages; preserve motion with visible fallbacks.
- [x] Verify controls, mobile overflow, contrast, reduced motion and no-JS content.

## Task 4: Integrated verification and handover

Files: release evidence document, README, targeted tests.

- [x] Run lint, typecheck, unit/model tests, migration metadata and production build.
- [x] Run available PostgreSQL integration and browser tests, then production smoke.
- [x] Inspect whole diff and conduct the user's point-by-point UI review; fix findings.
- [x] Record evidence, exact external requirements, and local run instructions.

## Handover

All implementation tasks completed. See `docs/validation-2026-10-29.md` for measured results and the external release gates. The application is prepared for staging; live production has not been provisioned or opened.
