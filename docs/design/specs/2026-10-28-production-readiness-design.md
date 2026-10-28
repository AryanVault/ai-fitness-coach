# FitCoach production readiness

Approved by the user on 28 October 2026: retain the stack, fix reliability,
redesign the application around real movement-session evidence, and verify release readiness.

## Scope and architecture

Keep Next.js, React, Drizzle/PostgreSQL, Clerk, Upstash, existing ownership rules,
the local pose worker and conservative learned-model gates. Preserve persisted data.
Fix failures in existing flows before adding features. External service credentials,
physical-device measurements and deployment approval remain operator tasks.

## Experience

Make FitCoach a movement session journal: a quiet, precise training studio with
deep green ink, mineral white, desaturated sage, and dark forest surfaces.
A self-hosted character display face signs the brand; system sans carries controls.
The signature is an interactive movement study using actual exercise landmarks and
existing exercise geometry. Label any illustration explicitly as a demonstration.
No invented activity, readiness, customer claims or scope claims.

Compose the public first screen as a full-viewport movement study with integrated
navigation, one clear start action, large controlled type and working movement selection.
Continue its movement language through explanatory sections and the application shell.
App routes share restrained surfaces, typography and visible focus states. Preserve
functional data tables and charts. Content is visible by default, including without JS.
All motion respects reduced motion. No glowing boxes, grid-paper, hover lifts or emoji logos.

## Reliability

Recovery load/save always settle, expose errors and support retry. Dashboard distinguishes
unavailable data from true empty state and can retry. Protected routes include recovery.
Navigation has accessible names, correct active states and resilient storage access.
Authentication, data ownership, session retry and camera cleanup remain intact.

## Release verification

Run lint, typecheck, unit tests, model pipeline tests, migrations metadata and production
build. Add targeted browser coverage for new controls and network failure recovery.
Use an isolated local PostgreSQL database for integration checks if available. Run
production public smoke. Audit runtime dependencies and harden reproducible deployment.
Record exact results and remaining external requirements; never equate a successful build
with validated biomechanics or complete service/device acceptance.

## Alternatives

Full rewrite rejected because it discards tested persistence and camera behavior.
Infrastructure-only patch rejected because it leaves broken and misleading user flows.
The existing-stack approach keeps risk bounded while improving the actual product.
