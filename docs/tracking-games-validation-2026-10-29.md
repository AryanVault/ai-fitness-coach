# Body-registered tracking and movement games: validation

## What changed

One local camera drives an image-registered skeleton and three movement games. Orthographic depth rendering now uses the image plane, without arbitrary perspective distortion. Video, both canvas layers and game SVG use the same contained-image letterbox and mirroring. Display filtering responds faster than analysis filtering; both are timestamp-aware and normalize speed by body scale/aspect. An observation guard suppresses isolated implausible jumps and invalid evidence without creating visible predicted joints.

Tracking model choices: Balanced (MediaPipe Full with Lite fallback), High detail (Heavy with measured latency fallback), and MoveNet Thunder (a separate TensorFlow.js WASM worker). Models and WASM are served from the application's own origin. Frames remain local. Unsupported MoveNet fingers/toes and metric depth remain unavailable. The alternative's single-pose output does not establish single-person presence; keep one person in frame. An unavailable alternative returns to a usable baseline with a visible explanation.

Runtime reports retain the actual provider/model/delegate identity with the sampled timing bucket. A fallback starts a new bucket, and missing final observations cannot relabel earlier timings. Inference p50/p95 exclude physical capture and display latency.

Games learn a comfortable neutral position and practice range before awarding points. Curl bubbles require target contact and controlled return. Cardio alternates hand targets after learning both reaches. Pushup levels require a side view, a horizontal supported body, planted support hand/feet, observed lowering and a complete return. Upright arm curls cannot calibrate or score as pushups. Levels increase the required completed movements (5,7,9,11,13); they do not force deeper joints or heavier weights. Level/side changes restart calibration and points. Game points are session-local and separate from persisted workout form scores.

Tracking loss, stale/slow frames, missing working joints, an interruption, or an out-of-frame target discards a partial movement. Pause/Rest, restart, exit, level and side controls work. Start brings the camera into view. Off-screen previews switch capture scheduling so scrolling does not strand inference. Existing camera lifecycle, audio-clock, pending-save recovery, PiP and session-generation work is preserved.

## Scientific comparison

Run:

```sh
npm run tracking:benchmark -- --input fixtures/tracking/comparison-synthetic.json
```

This fixture is explicitly synthetic and demonstrates the evaluator, not neural-model accuracy. Supply a consented, annotated comparison file using `trackingReplaySchema` in `src/lib/pose/tracking-benchmark.ts` for human data. Every candidate must use the same frame IDs. Coordinates are image-normalized, ground-truth shoulders/hips establish scale, and the joint list selects comparable landmarks. PCK at 0.1 torso lengths includes missing predictions as failures. Coverage/missing joints are reported alongside mean/p95 error on observed predictions. Missing observations cannot improve PCK by vanishing from its denominator. Timing fields are inference-only, not capture-to-feedback.

Prepare/recover upstream model assets with `npm run tracking:prepare`; worker/WASM assets regenerate with `npm run worker:build`. Source URLs and SHA-256 hashes are in `public/movenet/download-manifest.json`.

## Verification record

- RED/GREEN tests cover projection, independent display response, cadence/scale invariance, joint jumps/reacquisition, unavailable depth, model adapters/fallback, paired benchmark accounting and identity-specific timing buckets.
- Game replays cover complete curl/pushup/cardio cycles, stationary holds, asymmetrical calibration, body scale/translation, visibility loss, gaps, stale frames, upright-curl spoofing and moving support hands.
- Real browser worker smoke executed MoveNet Thunder and MediaPipe Heavy with GPU disabled. This proves local loading/execution, not movement accuracy.
- Browser game flow passed at 1440px and 393px, including calibration, one complete curl score, pause, model selection, level/side changes, restart/exit and 2D/3D/portrait controls. Earlier runs were invalidated by simultaneous source changes; only stable final runs count.
- The first combined camera/dance regression found a missing exercise catalog in the newly isolated database. The test database was seeded before rerunning; no product-code workaround was added.
- The complete design-law recheck is in `tracking-games-ui-review-2026-10-29.md`.

Stable final results:

| Check | Result |
| --- | --- |
| Full unit suite, Node 22.23.4 | 267 passed in 58 files |
| TypeScript, Node 22.23.4 | Passed (`tsc --noEmit`) |
| ESLint, Node 22.23.4 | Passed |
| Both worker builds, Node 22.23.4 | Passed |
| Combined camera/dance/games browser suite, Node 22 runner + Chromium | 7 passed in 1.1 minutes |
| Comparative benchmark CLI | Passed on the explicitly synthetic fixture |
| Fresh code review | Three findings reproduced and fixed with RED/GREEN regressions: pushup spoofing, visible-right-side gate, provider timing attribution |
| Design law | All 119 entries revisited; screenshots and corrections recorded |
| Diff whitespace | Passed |

The dev server for these browser checks ran on the host Node 26 runtime with an isolated `.next-games` output and a dedicated test database; the final test runner, unit suite, typecheck, lint and worker build used Node 22.23.4. A production-image build and the other chat's broader camera matrix are coordinated in the production-readiness chat and are not claimed as completed by this record.

## Limits and next evidence

No state-of-the-art, measured human-accuracy, biomechanical joint-angle, force, muscle activation or injury-risk claim is established. Depth is estimated by the model. Far-side torso anchors still need usable evidence; an unobservable view stays paused. Real laptop/Android recordings with varied clothing, body sizes, skin tones, lighting, occlusion, wrong/partial reps and camera positions are needed for an accuracy comparison. Sustained device heat, battery use and capture-to-feedback delay remain unmeasured. RTMPose/ONNX is a research candidate; this change ships a working MoveNet alternative rather than presenting ONNX export as verified browser compatibility.

Existing user changes remain uncommitted. No remote push/deployment was performed. CodeGraph was absent; context-mode and ctx stats were unavailable. Investigation used targeted compact reads.
