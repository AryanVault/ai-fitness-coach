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

- [ ] Reproduce missing recovery redirect and failed load/save behavior with targeted tests.
- [ ] Add error, retry and finally paths; preserve existing successful response contracts.
- [ ] Verify unauthenticated navigation, HTTP errors, rejected fetch and successful retry.

## Task 2: Release configuration

Files: `next.config.ts`, `Dockerfile`, `docker-compose.yml`, `package.json`, lockfile and `.github/workflows/ci.yml` as justified by evidence.

- [ ] Inspect dependency audit and deployment build/runtime environment consistency.
- [ ] Apply bounded fixes with tests or build checks; never bypass environment gates.
- [ ] Verify production build and configuration. Record externally blocked checks honestly.

## Task 3: Movement visual system

Files: `src/app/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/layout/AppLayout.tsx`, new `src/components/brand/` movement/mark components and public font assets.

- [ ] Render and select a properly licensed self-hosted display face.
- [ ] Build a responsive, working movement study and truthful public content.
- [ ] Apply coherent design tokens and shell; accessible controls, safe storage, skip link.
- [ ] Replace hidden entrance defaults across app pages; preserve motion with visible fallbacks.
- [ ] Verify controls, mobile overflow, contrast, reduced motion and no-JS content.

## Task 4: Integrated verification and handover

Files: release evidence document, README, targeted tests.

- [ ] Run lint, typecheck, unit/model tests, migration metadata and production build.
- [ ] Run available PostgreSQL integration and browser tests, then production smoke.
- [ ] Inspect whole diff and conduct the user's point-by-point UI review; fix findings.
- [ ] Record evidence, exact external requirements, and local run instructions.
