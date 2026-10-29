# On-device movement engine upgrade

Approved by the user on 2026-10-29. Primary devices: laptop webcams and Android browsers.

Keep MediaPipe behind the existing worker boundary. Raw frames remain on the device. Preserve historical session payloads; identify new analysis as movement-engine-v3. Do not claim measured device accuracy or state-of-the-art performance without a representative recorded benchmark.

Tracking uses timestamp-aware adaptive position filtering. Visibility is current evidence and must never be averaged with past visibility. Reset temporal state on discontinuities, exercise changes, and lost tracking. Infer view using dimensionless geometry rather than image size. Report landmark visibility as visibility, not a calibrated probability. Distinguish processing cadence from capture rate.

Fitness aggregates only reliable finite measurements. Explicit score availability accompanies compatibility numeric fields; unmeasured physiology, injury risk, and endurance must not masquerade as measured scores. Use camera-view-aware observability and interruption-safe phase tracking. Calibration uses elapsed stable time rather than frame counts.

Dance compares body-relative geometry, with aspect correction before normalization. Timing requires observed motion events and a synchronized routine clock. A stationary pose, missing history, invalid visibility, or an unsynchronized clock cannot earn timing credit. Compare movement events to the nearest BPM beat, report signed offset, expire stale events, and reset history across interruptions. Static starter reference poses remain labeled checkpoints, not captured expert motion. Support optional timestamped reference keyframes without fabricating a reference recording.

Audio starts from the session's user gesture, follows the audio clock, reports blocked playback, and stops on session end, exercise change, navigation, or hidden page. Silent practice remains available with timing unavailable. Show actual beat/count and measured timing only when observable.

Validation includes deterministic replays for distance invariance, visibility loss, cadence changes, stationary dance, on/off-beat movement, gaps, and partial cycles. Report synthetic fixtures separately from real device and expert-labeled accuracy evidence. Verify working controls and responsive camera UI against the user's entire design law.
