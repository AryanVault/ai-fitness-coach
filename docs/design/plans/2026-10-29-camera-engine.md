# Camera Engine Implementation Plan

**Goal:** Implement the approved reliable on-device camera coach for laptop and Android browsers.
**Architecture:** Timestamp-aware tracking feeds observable fitness metrics and a stateful dance event engine. An audio transport supplies the shared routine clock. Compatibility fields preserve old sessions; new evidence is versioned.
**Tech stack:** Next.js, React, TypeScript, MediaPipe worker, Web Audio/HTML audio, Vitest, Playwright.
**Spec:** `docs/design/specs/2026-10-29-camera-engine-design.md`

## Global constraints

Raw frames stay on device. Preserve historical sessions. No invented expert motion or physical-device benchmark. Keep current stack and working navigation guard. Use visible-by-default UI and existing accessible primitives. User explicitly approved full implementation; proceed without another approval gate.

## Review focus

- A single occluded critical joint immediately suppresses dependent measurements.
- A lower processing cadence does not change filter or calibration duration.
- Stationary poses and stale motion never earn beat timing.
- Tracking interruptions cannot join partial reps or dance events.
- Browser audio failure leaves usable silent practice with timing unavailable.

### Task 1: Tracking evidence
Files: `src/lib/pose/confidence.ts`, `quality.ts`, `tracking-engine.ts`, relevant tests.
- [x] Add red regressions for raw visibility loss, camera-distance view invariance, variable cadence.
- [x] Add adaptive timestamp filter and current visibility; dimensionless view inference; honest cadence gate.
- [x] Run tracking/confidence/quality tests.

### Task 2: Observable fitness
Files: `src/lib/pose/exercises.ts`, `types.ts`, phase tests; analyzer UI.
- [x] Add reliable-only score aggregation with availability fields, remove invented fallback measurements.
- [x] Gate sagittal depth by camera view; test interruption and return-to-start rep behavior.
- [x] Run exercise/core-engine tests.

### Task 3: Temporal dance
Files: `src/lib/dance/motion.ts`, `comparator.ts`, `training-engine.ts`, `types.ts`, tests.
Interface: `createDanceMotionTracker().update({landmarks,timestampMs,routineMs,bpm,synchronized})` returns timing/transition evidence; `.reset()` discards history.
- [x] Add red tests for stationary timing and body-scale invariance.
- [x] Detect normalized movement onsets, nearest-beat offset, stale/gap suppression; optional keyframe interpolation.
- [x] Thread evidence through training/comparator and average only reliable metrics.
- [x] Run dance tests and deterministic replay benchmark.

### Task 4: Session clock and camera UI
Files: `src/lib/dance/audio-transport.ts`, `src/components/PoseAnalyzer.tsx`, dance display components, tests.
Interface: audio transport exposes `start(url)`, `stop()`, `positionMs()`, synchronized state.
- [x] Integrate user-gesture audio, cleanup, monotonic session timing, elapsed-time calibration, temporal resets.
- [x] Show unavailable metrics honestly and version saved analysis.
- [x] Verify audio failure/cleanup and click actual controls at desktop/mobile widths.

### Task 5: Release evidence
Files: `docs/camera-engine-validation-2026-10-29.md`, replay benchmark/tests.
- [x] Run unit tests, lint, type checking, build, and camera browser regressions.
- [x] Review entire supplied design law; repair visual/interaction issues.
- [x] Record exact results and remaining physical-device validation; commit reviewed changes locally.

### Task 6: Automated laptop/Android follow-up, completed 30 October
- [x] Reproduce and fix acquisition cancellation, retired streams, rear-camera identity, worker/camera failure and frozen-audio timing.
- [x] Verify session preservation, stale-report isolation, profile gating and idempotent save recovery.
- [x] Verify touch dragging, rotation, contrast and text bounds; recheck the full design law.
- [x] Coordinate the concurrent tracking/game upgrade, isolate build outputs and verify the combined source freeze.
- [x] Verify model recovery provenance/checksums, Node 22 unit/database/browser checks, production image and real worker execution.
- [x] Record results and remaining hardware/staging limits in `docs/device-camera-validation-2026-10-29.md`.
