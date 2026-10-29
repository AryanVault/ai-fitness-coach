# Production hardening evidence: 29 October 2026

Implementation branch: `improve/production-readiness`, based on `980b35f`.
These are local engineering results for the handover changes. They do not
establish a live release, real Clerk acceptance or validated form accuracy.

## Changes

- Replaced the generic public page with a working synthetic movement study,
  local OFL display fonts, truthful scope and privacy content.
- Rebuilt shared navigation with mobile sheet, accessible labels, active routes,
  optional storage and appearance choices. Preserved modified-click camera behavior.
- Removed hidden entrance defaults, generic card/button glows, fake featured
  workouts, unsupported dance links and the invented body-battery curve.
- Made the catalog searchable/filterable with supported canonical coach deep links.
- Added bounded, abortable client requests and explicit retry/error states to
  recovery, dashboard and library. Failed recovery saves preserve edits.
- Added explicit expired-session redirects, using a shared server/client route boundary.
- Protected recovery pages; production sign-in selects Clerk and preserves safe
  return paths including exercise queries. Missing readiness check-ins are explicit.
- Fixed camera cold-inference startup without loosening the warmed-frame deadline.
- Patched dependencies, standardized Node 22 / npm 10.9.9, separated local Compose
  development from production, and produced a standalone nonroot image.
- Added production anti-framing headers without restricting MediaPipe WASM or Clerk scripts.
- Removed the stale Bun lock and generated test marker from version control.
  The obsolete SQLite file was untracked and left intact locally; PostgreSQL is unchanged.

## Verified results

| Check | Result |
| --- | --- |
| ESLint | Passed, full repository |
| TypeScript | Passed in the final production build; earlier explicit typecheck also passed |
| Unit tests | 185 passed in 41 files |
| Python model-pipeline guards | 10 passed using `python3 -m unittest discover -s tests/ml -p 'test_*.py'` |
| Dependency audit | 0 findings across all severities, including development dependencies; baseline was 26 |
| Migration metadata | `npm run db:check` passed |
| PostgreSQL 16 migration verification | Fresh migration, legacy upgrade preservation and repeat migration passed; 27 tables |
| PostgreSQL integrity tests | 6 passed, including concurrent retries/conflicts, ownership denial, rollback, deletion and encrypted backup/restore |
| Development browser checks | 37 passed in one full run, 2 production-only checks skipped |
| Production browser smoke | 13 passed, 26 development-authenticated checks intentionally skipped |
| Optimized production build | Passed with webpack, local font assets and generated classic pose worker |
| Linux Node 22 Docker build | Passed; image `fitcoach-production-check` |
| Docker runtime | Nonroot UID 1001; public page and worker 200; framing headers present; no powered-by header |
| Production service gates | Unconfigured private API and health requests return 503; demo cookie is rejected |
| Compose | All profiles parse successfully with `docker-compose config --quiet` |
| Local preview | Separate development database migrated and seeded; health returns 200/ready |

Development browser coverage includes authenticated activity persistence, idempotent
saves and conflicts, cross-account denial, plan/nutrition generation using identified
fallbacks, nutrition/progress/recovery/settings/chat, export, deletion, sign-out,
catalog filters/retry, HTTP and network failures, mobile layout, reduced motion,
JavaScript-disabled public content, offline normalization and worker assets.

Camera checks use a fake camera, GPU-disabled worker inference, and synthetic
landmarks for lifecycle isolation. They cover model initialization, frame transfer,
one request in flight, modified navigation clicks, capture cleanup, preview layout,
picture-in-picture, minimization, session save and route departure. They do not
measure biomechanical accuracy or physical Android performance.

## Failures investigated

- Default Turbopack startup exposed an obsolete visual-editor loader error when parsing
  source paths. Development now uses the same verified webpack engine as production,
  and the unused loader hook has been removed. The final full browser run uses the
  normal `npm run dev` command.
- Expired cookies previously left private pages in a retry loop. The session provider
  now handles 401 by returning to sign-in with the intended local path preserved;
  server and client share one private-route classifier. Unit and browser regressions pass.

- A mixed-child SVG title caused hydration mismatch. Rendering a single title
  string fixed it; browser tests assert no uncaught hydration errors.
- Recovery/dashboard failures were reproduced before adding error/finally/retry
  behavior. Browser tests exercise recovery after failed responses and rejected fetches.
- Initial CPU inference measured 5,063 ms against a 5,000 ms deadline; subsequent
  frames measured 94–97 ms. Startup now has the existing model-initialization
  30-second budget until the first result; later frames retain 5 seconds. A failing
  regression test reproduced the problem before the fix; cold and steady deadlines
  are verified separately. Model replacement resets the warm-up state.
- Development HMR and parallel debugging caused transient router errors/navigation
  failures. Clean, sequential final camera checks pass in 13.6 seconds. Do not treat
  an actively recompiling development server as production acceptance evidence.
- An interrupted development shutdown left an empty generated `.next/dev/types/routes.d.ts`
  and blocked a local production typecheck. Removing generated development types
  after stopping the server resolved the build. The clean Linux Docker build also passes.

## Environments and limitations

Host validation used macOS, Node 26, Chromium and PostgreSQL 16 in a local container.
The supported application runtime and CI target is Node 22; the Linux production
image builds and boots on Node 22 with npm 10.9.9. The host's standard-library Python
guards were run with `python3`; use the configured Python command on systems where
`python` is not installed. No learned artifact was trained or promoted.

Docker public-key checks used a syntactically valid test publishable key pointing at
a reserved invalid domain. This verifies packaging and configuration mechanics only.
No real production credentials, identity provider, Redis service, hosting account or
production data were accessed. GitHub CI has not run on this local branch.

CodeGraph and context-mode tooling are unavailable in this environment; `.codegraph/`
does not exist and `ctx stats` is not installed. Investigation used targeted local
reads, bounded logs, actual browser interaction and executable tests.

## Before opening production

1. Provision and verify separate real staging/production Clerk, PostgreSQL, Redis
   and hosting services. Supply public values at build time and secrets at runtime.
2. Inventory existing deployed identities and rehearse backup restoration before
   enabling the migration-inventoried flag. Verify linking with both proved sessions.
3. Run authenticated staging acceptance for Clerk lifecycle, quota-service outages,
   AI provider outages, deletion retries/cron, backup monitoring and budget alerts.
4. Run CI for the release revision and complete physical laptop/Android camera,
   permission, recovery, rep-count, cue-delay and accessibility validation.
5. Keep signups closed, payments off and learned posture models disabled until their
   separate release evidence is complete. Follow the existing release checklist.

See [deployment runbook](production-beta-runbook.md),
[release checklist](beta-release-checklist.md) and
[point-by-point design review](ui-review-2026-10-29.md).
