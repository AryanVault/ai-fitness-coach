# Camera tracking and movement games Implementation Plan

**Goal:** Body-registered skeleton tracking and three playable movement games on one local camera.

**Architecture:** Keep capture, inference, observation validation, analysis and rendering separate. Games consume reliable tracking frames in a pure state machine; an accessible HTML panel controls a body-relative SVG overlay.

**Tech Stack:** Next.js 16, React 19, MediaPipe Tasks Vision, Three.js, Vitest, Playwright; browser-local alternative pose inference.

**Spec:** docs/design/specs/2026-10-29-tracking-games-design.md

## Global Constraints
- One phone/laptop camera; on-device inference.
- Preserve existing worktree changes and session payload compatibility.
- Never fabricate missing joints or metric depth.
- No score for stationary holds, jitter, hidden joints, low cadence, stale frames or cycles crossing interruptions.
- No state-of-the-art accuracy claims without representative real-device labeled evidence.

## Review Focus
- Portrait and mirrored previews: video, skeleton and targets use the same letterbox.
- Camera/model changes and interruptions: discard partial cycles and old inference results.
- Missing keypoints in an alternative model: remain invisible and unmeasured.
- Fast legitimate exercise: validation must not reject coherent whole-body translation.
- Held target or changing difficulty: cannot manufacture points or join incomplete cycles.

### Task 1: Registered rendering and robust observations
**Files:** create src/lib/pose/projection.ts, observation-guard.ts and tests; modify landmark-filter.ts, tracking-engine.ts, confidence.ts, types.ts and coach/pose-renderer.ts.
**Interfaces:** createObservationGuard().update(points, timestampMs, aspectRatio) returns landmarks and rejected indices; landmarkToScene(point, aspectRatio, mirror) aligns an orthographic image plane; displayLandmarks optional on TrackingFrame.
- [x] Write and run failing tests for projection, isolated jumps, coherent movement, reacquisition, cadence and scale.
- [x] Implement observation guard and independent display filter; register orthographic rendering with image dimensions.
- [x] Run targeted pose unit tests; expected all pass.

### Task 2: Model choices and comparative measurement
**Files:** create pose provider configuration/adapter and tests; modify tracking.worker.ts, tracking-engine.ts, useCameraRuntime.ts, PoseAnalyzer.tsx, worker build and model asset scripts.
**Interfaces:** tracking mode auto/detail/alternative resolves to explicit local model and provider; failures return to usable baseline with a visible message and reset history.
- [x] Write failing tests for model mapping, missing joints and fallback.
- [x] Add Heavy and a functional non-MediaPipe backend, explicitly 2D when no depth exists; self-host artifacts and license notices.
- [x] Verify worker builds and actual model inference; record unresolved RTMPose export/device comparison rather than invent results.

### Task 3: Movement game state machine
**Files:** create src/lib/games/movement-game.ts and movement-game.test.ts.
**Interfaces:** createMovementGame(mode, level).update(frame|null) returns phase, calibrated targets, points, completed cycles, level and instructions; pause/reset invalidate partial cycles.
- [x] Write failing replay tests for curl reach-return, pushup cycles and alternating cardio reaches, plus jitter/stationary/occlusion/time-gap cases.
- [x] Implement calibrated body-relative targets and validated movement cycles.
- [x] Run game replay tests; expected all pass.

### Task 4: Playable UI and final verification
**Files:** create coach/MovementGames.tsx and game overlay; integrate into PoseAnalyzer; add tests/e2e/movement-games.spec.ts and validation record.
**Interfaces:** panel consumes TrackingFrame|null, camera state, mirror and model availability; activity selection resets tracking before a game starts.
- [x] Add browser tests covering game selection/start/pause/restart/exit, model controls, responsive preview and target registration.
- [x] Build accessible controls using existing primitives, clear scoring and authored target feedback; all content visible by default.
- [x] Run unit suite, typecheck, lint and relevant browser checks. Perform fresh review and point-by-point design-law review.
