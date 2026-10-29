export function createCalibrationTimer() {
  let stableSince: number | null = null;
  let previousMs: number | null = null;
  const reset = () => { stableSince = null; previousMs = null; };
  return {
    reset,
    update(timestampMs: number, ready: boolean, requiredMs: number) {
      if (!ready || !Number.isFinite(timestampMs)) { reset(); return 0; }
      if (previousMs === null || timestampMs <= previousMs || timestampMs - previousMs > 500) stableSince = timestampMs;
      previousMs = timestampMs; stableSince ??= timestampMs;
      return Math.min(requiredMs, Math.max(0, timestampMs - stableSince));
    },
  };
}
