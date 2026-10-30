# Laptop and Android camera follow-up

The user chose automated testing for this pass. Android results below mean Chromium with Pixel 7 viewport, user agent, touch and mobile emulation. They do not mean a physical Android camera, Android Chrome runtime, thermal or battery test.

## Fixes

- Separate camera acquisition generations from frame scheduling. Visibility, preview minimization and orientation cannot cancel a valid pending start. Late permission results and retired track events cannot stop a replacement camera.
- Stop retrying permission, security, missing-device and busy-device failures. Quality fallback remains available for constraint failures. Rear-camera acquisition stays rear-only; reported front-camera substitution is rejected. Failed or cancelled rear switches restore the prior target, labels and mirroring.
- Discard analysis results and errors from retired streams. Camera disconnection or worker failure releases capture, stops dance audio, and saves the active session through the recoverable session queue.
- Reject a frozen audio clock after 250 ms without forward progress, while allowing 100 ms clock quantization. Reject captures preceding playback and backward clock corrections until progress resumes.
- Preserve the active workout before changing exercises. Generation checks prevent a retired save or summary response from replacing the new exercise report or stopping its camera.
- Block starting before the saved profile is available. A failed profile read shows a reload instruction.
- Refresh saved dance progress after a queued session retry succeeds. The same client session ID is retained across failure, reload and retry.
- Keep a touch-dragged preview inside the viewport after landscape rotation. Its drag handle supports arrow keys and prevents native touch scrolling while dragging.
- Fix save-warning contrast and define the missing destructive foreground token. Regressions measured about 1.02:1 for the warning and 1.75:1 for the stop button before correction. Stop-button checks require at least 4.5:1 in both themes.
- Give posture measurements a full-width row so the uncalibrated confidence label fits the desktop sidebar. Browser checks assert the label's scroll width fits its rendered width.
- Preserve the complete model provenance manifest during partial cache recovery. Cached hashes are checked against the recorded pins, corrupt files are repaired, and mismatched downloads are rejected. A sandboxed regression covers recovery, repeated cached runs, corruption and checksum rejection without network access or changes to shipped models.

## Verification

Final verification completed on 30 October 2026, after the tracking/game chat handed off its source freeze.

| Check | Result |
| --- | --- |
| Full unit suite, Node 22.23.4 | 268 passed in 59 files |
| PostgreSQL integration | 7 passed against the isolated `fitcoach_test` database |
| Laptop/Android-emulation camera, dance, games and worker browser matrix | 31 passed in 3.0 minutes in the final uninterrupted run |
| Production-image browser worker tests | 2 passed; MediaPipe Full, Heavy and MoveNet Thunder executed from the built image |
| ESLint / TypeScript | Passed on Node 22.23.4; optimized production build also passed its TypeScript check |
| Production dependency audit | 0 vulnerabilities, npm 10.9.9 |
| Production image | `fitcoach-device-check`, image `29ecd76990ff`; Node v22.23.4, nonroot UID 1001 |
| Production HTTP smoke | App, both worker scripts, SIMD WASM and routine audio returned 200 with appropriate content types; private session API returned 503 with services unconfigured; framing denied; no powered-by header |
| Model asset recovery / provenance | Sandboxed RED/GREEN regression passed; real cached preparation retained all 5 artifacts and their matching hashes |
| Synthetic movement replay | 5 authored cases passed, zero false positives/negatives; software regression only |
| Synthetic paired tracking benchmark | CLI passed on the authored fixture; no human accuracy evidence |
| UI review | Both 119-entry camera/tracking design-law records revisited, with contrast, confidence-label overflow and viewport-edge corrections verified |

The image uses synthetic public build arguments for release validation. It does not verify live Clerk/Redis/hosting configuration and must be rebuilt with the deployment's public configuration. The temporary production smoke container was removed. The local demo preview remains on port 3118, using Node 22 and isolated generated output.

The device matrix covers a completed curl, interrupted motion, permission denial/retry, profile failure, pending camera permission during exercise changes, active-session preservation, late summary responses, rear-camera switching/failure, simulated background interruption, save/reload/retry, track ending and worker failure. Android emulation additionally exercises native Chromium touch events and landscape resizing.

Chromium fake camera tracks retain real browser capture and video callbacks. The device matrix substitutes synthetic pose-worker output to control motion and failure cases. A separate regression starts the real MediaPipe CPU worker with GPU disabled. These checks verify application behavior, not pose-estimation accuracy.

Earlier runs overlapped tracking/game edits and two development servers sharing generated output. Next.js intermittently returned JSON parse failures from otherwise valid API routes. Final verification uses Node 22.23.4 and a dedicated `.next/camera-validation` output directory. The tracking/game server uses `.next-games` and a separate database. The curl fixture now supplies continuous angular motion rather than teleporting between poses, preserving the new observation-jump guard.

## UI review

The individual entries in `camera-ui-review-2026-10-29.md` were revisited for this follow-up. Existing self-hosted type, mineral surfaces, forest ink and frame-driven movement remain the visual system. No new marketing composition, decorative badge, icon tile, gradient, glow, hover lift, entrance reveal or mock product artifact was introduced.

Desktop and narrow viewport screenshots were inspected. Controls remain below the camera image; text remains visible without an entrance animation. Pointer controls, touch dragging, rotation, save recovery and theme contrast are covered by browser assertions. The changed warning uses ordinary readable type on a tonal surface. The preview clears viewport edges and keeps minimize/restore reachable after rotation. Review found and corrected the desktop confidence-label overflow, then reproduced the check on both layouts.

## Release boundary

Physical laptop/Android camera accuracy, sustained performance, orientation behavior on an actual device and thermal/battery measurements remain unverified. Existing staging-service and production authentication gates in the main validation record also remain. This pass does not establish state-of-the-art accuracy or certify the application for unrestricted production release.

CodeGraph is absent from this checkout. Context-mode tools are unavailable; `ctx stats` returned command not found. Investigation used targeted files and bounded log excerpts, without reading environment secrets.
