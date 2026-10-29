# Movement engine v3: validation record

Implemented for laptop webcams and Android browsers on the existing Next.js / MediaPipe stack. This is a substantial reliability and evidence upgrade. It is not a demonstrated state-of-the-art accuracy result or physical-device certification.

## Changed behavior

- Timestamp-aware One Euro position filtering replaces frame-count-dependent smoothing. Visibility remains current, never smoothed over missing joints.
- Camera view uses dimensionless depth/width geometry. Critical-joint visibility, multiple-person ambiguity, stale frames and insufficient processing cadence suppress coaching.
- Squat/lunge rep counting requires an angled or side view. Front-view squat feedback is limited to observable alignment. Partial cycles cannot join across missing joints or gaps.
- Fitness scores average reliable finite measurements only. New availability metadata identifies unmeasured tempo, endurance, safety and other axes; compatibility numeric fields remain readable by historical consumers.
- Dance pose metrics are body-relative and use aspect-corrected points. Bounce uses recent hip-to-foot height variation, not a front-view sagittal knee angle.
- Beat timing uses detected movement onset against the audio clock. No history, a stationary pose, stale events, poor visibility, ambiguous sampling or silent playback cannot earn timing credit. The displayed offset includes sampling uncertainty; camera and audio hardware latency remain uncalibrated.
- A seamless 60-second, 96 BPM click track replaces the drifting eight-second loop. Phrase boundaries fall on complete eight-counts. Audio starts from the session gesture and releases on end, navigation, exercise change, hidden page and cleanup.
- Static authored starter poses are labeled checkpoints. Optional timestamped reference keyframes can interpolate; no expert reference recording was invented.
- Course progress no longer has a button that manufactures scores. New phrase completion requires at least three distinct timing events, at least 60% observed coverage, and existing score/reliability thresholds.
- Session evidence records `analysisVersion: movement-engine-v3`, score availability and sampled inference latency. Narrative refinement cannot replace camera-derived scores; summary grounding identifies unavailable values. Missing narrative mistakes no longer fall back to invented faults.
- Camera controls sit outside the video crop. Long corrections wrap. Portrait PiP respects its bottom offset, scrolls when needed, and dragging follows the pointer within the viewport. Repeated depth-view switching disposes the old WebGL resources. Decorative particles, orbit, glow and fabricated muscle intensity were removed.

Raw video and raw landmark arrays are not added to server telemetry by this upgrade. The rolling local replay remains on the device. Saved reports retain aggregate movement observations and analysis metadata.

## Verification

| Check | Result |
| --- | --- |
| Unit suite | 214 passed, 51 files |
| PostgreSQL integration | 7 passed; includes v3 availability persistence and no completion for a high-scoring stationary dance attempt |
| Camera browser regression | CPU worker startup and preview layout/PiP/minimization/save/navigation passed |
| Dance browser regression | 1440px and 393px passed: course failure/retry, phrase selection, actual audio play/stop/restart, repeated 2D/3D switching, stationary timing suppression, no horizontal overflow, save and course completion checks |
| Lint | Passed |
| Type checking | Passed |
| Production image | Passed; final image `fitcoach-camera-v3-check`, image ID `e5f1a93f93d9`. Node v22.23.4, nonroot UID 1001; app, worker and 60-second audio returned 200; private session API returned 503 with production services unconfigured; framing denied and no powered-by header. Temporary smoke container removed. |
| Design-law review | 119 individual rule/technique entries revisited; corrections and screenshots recorded in `camera-ui-review-2026-10-29.md` |

Host checks used macOS Node 26 and Chromium. The supported production target remains Node 22 / npm 10.9.9. Browser tests used Chromium's fake camera; the worker startup check ran real MediaPipe inference with GPU disabled. Synthetic pose tests isolate application behavior and are not accuracy measurements.

## Reproducible replay benchmark

Run `npm run camera:benchmark`. The default fixture contains five explicitly synthetic cases: isolated onsets at 15/30 Hz and two body scales, plus a stationary sequence. It processed 360 frames and detected the four expected events without extra events. This establishes deterministic regression behavior only.

The JSON report in ignored `reports/movement-engine-synthetic.json` records event counts, absolute onset error, and JavaScript analysis p50/p95. These timings exclude camera capture, pose inference, physical audio output and rendering. They must not be presented as end-to-end device latency or human movement accuracy.

To evaluate real labeled landmarks, run:

```sh
npm run camera:benchmark -- --input /absolute/path/labeled-replay.json --output reports/device-replay.json
```

Input is validated by `movementReplaySchema` in `src/lib/dance/replay-benchmark.ts`: version `movement-replay-v1`; cases with `id`, `synthetic`, `annotationSource`, `device`, `bpm`, `expectedOnsetsMs`; each frame contains `timestampMs`, unwrapped `routineMs`, `aspectRatio`, `synchronized` and 33 finite landmarks with visibility. Label synthetic data honestly. The matcher allows 150 ms and reports false positives and missed events separately; it does not hide misses behind an average timing score.

## Remaining accuracy and release evidence

Before an accuracy or state-of-the-art claim, collect consented, expert-labeled examples across actual laptop webcams and Android devices, body sizes, clothing, skin tones, lighting, occlusion, camera orientations and supported movements. Include incorrect and partial reps, stationary and off-beat dance, multiple people, permission denial, background/resume and camera switching. Report event precision/recall, rep-count error, per-view observability, capture-to-feedback latency and sustained thermal behavior by device/model/delegate.

The app now exposes configured camera rate separately from actual analysis cadence, current inference duration and frame age, and saves sampled inference p50/p95. Use those measurements during physical-device runs. MediaPipe world landmarks are model estimates; they do not establish calibrated physical joint measurements, load, injury risk or physiological fatigue. The starter routine remains authored geometry, not a captured expert motion corpus. A representative corpus and comparative model evaluation remain necessary for a state-of-the-art claim.

Production Clerk/Redis/hosting setup and the earlier whole-project release gates remain in `validation-2026-10-29.md`. No remote deployment or repository push was performed.

Tool availability: `.codegraph/` was absent. Context-mode tools were unavailable and `ctx stats` returned command not found; investigation used bounded targeted reads and saved test logs.
