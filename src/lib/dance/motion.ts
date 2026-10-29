import type { Landmark } from "@/lib/pose/types";

export type DanceMotionEvidence = {
  timingReliable: boolean;
  timingScore: number;
  offsetMs: number | null;
  eventId: number | null;
  onsetRoutineMs?: number | null;
  samplingUncertaintyMs?: number | null;
  bounceAmplitude?: number;
  bounceReliable?: boolean;
  transitionReliable: boolean;
  transitionScore: number;
  speed: number;
  reason: string;
};

export const EMPTY_DANCE_MOTION: DanceMotionEvidence = {
  timingReliable: false, timingScore: 0, offsetMs: null, eventId: null,
  transitionReliable: false, transitionScore: 0, speed: 0,
  reason: "Move to the beat to measure timing.",
};

// Front-view, body-relative motion features. Translation and camera distance
// cancel; hip-to-foot height retains bounce that hip-centering would erase.
function features(points: Landmark[]): number[] | null {
  const required = [11, 12, 15, 16, 23, 24, 27, 28];
  if (required.some(i => !points[i] || !Number.isFinite(points[i].x) || !Number.isFinite(points[i].y) || (points[i].visibility ?? 0) < .6)) return null;
  const span = Math.hypot(points[12].x - points[11].x, points[12].y - points[11].y);
  if (span < .001) return null;
  const sx = (points[11].x + points[12].x) / 2;
  const sy = (points[11].y + points[12].y) / 2;
  return [
    (points[15].x - sx) / span, (points[15].y - sy) / span,
    (points[16].x - sx) / span, (points[16].y - sy) / span,
    ((points[23].x + points[24].x - points[27].x - points[28].x) / 2) / span,
    ((points[23].y + points[24].y - points[27].y - points[28].y) / 2) / span,
  ];
}

export function createDanceMotionTracker() {
  let previous: number[] | null = null;
  let anchor: number[] | null = null;
  let lastMs: number | null = null;
  let startedMs = 0;
  let active = false;
  let quietSince: number | null = null;
  let lastEvent: { timestampMs: number; routineMs: number; offsetMs: number; id: number; uncertaintyMs: number } | null = null;
  let serial = 0;
  let priorVelocity = 0;
  let lastRoutineMs: number | null = null;
  let lastBpm: number | null = null;
  let bounceHistory: Array<{ timeMs: number; height: number }> = [];
  const reset = () => {
    previous = null; anchor = null; lastMs = null; startedMs = 0; active = false;
    quietSince = null; lastEvent = null; priorVelocity = 0; lastRoutineMs = null; lastBpm = null;
    bounceHistory = [];
  };
  return {
    reset,
    update(input: { landmarks: Landmark[]; timestampMs: number; routineMs: number; bpm: number; synchronized: boolean }): DanceMotionEvidence {
      const current = features(input.landmarks);
      if (!current || !input.synchronized || !Number.isFinite(input.routineMs) || !Number.isFinite(input.bpm) || input.bpm < 30 || input.bpm > 240) {
        reset();
        return { ...EMPTY_DANCE_MOTION, reason: !input.synchronized ? "Start routine audio to measure beat timing." : "Show wrists, hips, and feet to measure movement timing." };
      }
      const dtMs = lastMs === null ? 0 : input.timestampMs - lastMs;
      const clockJump = lastRoutineMs !== null && Math.abs((input.routineMs - lastRoutineMs) - dtMs) > 120;
      if (!previous || !anchor || dtMs <= 0 || dtMs > 350 || clockJump || lastBpm !== input.bpm) {
        reset(); previous = current; anchor = current; lastMs = input.timestampMs;
        lastRoutineMs = input.routineMs; lastBpm = input.bpm; startedMs = input.timestampMs;
        return { ...EMPTY_DANCE_MOTION };
      }
      const beatMs = 60000 / input.bpm;
      bounceHistory = [...bounceHistory.filter(sample => input.timestampMs - sample.timeMs <= Math.min(beatMs * 2, 2000)), { timeMs: input.timestampMs, height: current[5] }];
      const bounceReliable = bounceHistory.length >= 5 && input.timestampMs - bounceHistory[0].timeMs >= beatMs && dtMs <= 180;
      const heights = bounceHistory.map(sample => sample.height);
      const bounceAmplitude = Math.max(...heights) - Math.min(...heights);
      const rms = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0) / a.length);
      const speed = rms(current, previous) / (dtMs / 1000);
      const displacement = rms(current, anchor);
      // Start once per excursion, re-arm only after a stable quiet interval.
      if (!active && speed >= .65 && displacement >= .06 && (!lastEvent || input.timestampMs - lastEvent.timestampMs >= 180)) {
        const onsetMs = input.routineMs - dtMs / 2;
        const offsetMs = onsetMs - Math.round(onsetMs / beatMs) * beatMs;
        lastEvent = { timestampMs: input.timestampMs, routineMs: onsetMs, offsetMs, id: ++serial, uncertaintyMs: dtMs / 2 };
        active = true; quietSince = null;
      }
      if (speed < .25) {
        quietSince ??= input.timestampMs;
        if (input.timestampMs - quietSince >= 100) { active = false; anchor = current; }
      } else quietSince = null;
      const eventFresh = lastEvent !== null && input.timestampMs - lastEvent.timestampMs <= Math.min(2 * beatMs, 1500);
      const timingReliable = eventFresh && lastEvent!.uncertaintyMs <= Math.min(90, beatMs * .15);
      const transitionReliable = active && input.timestampMs - startedMs >= 150 && dtMs <= 180;
      const transitionScore = Math.round(Math.max(0, 100 - Math.abs(speed - priorVelocity) / (dtMs / 1000) * 2));
      previous = current; lastMs = input.timestampMs; lastRoutineMs = input.routineMs; priorVelocity = speed;
      return {
        timingReliable, timingScore: timingReliable ? Math.round(Math.max(0, 100 * (1 - Math.abs(lastEvent!.offsetMs) / (beatMs / 2)))) : 0,
        offsetMs: timingReliable ? Math.round(lastEvent!.offsetMs) : null, eventId: timingReliable ? lastEvent!.id : null,
        onsetRoutineMs: timingReliable ? lastEvent!.routineMs : null,
        samplingUncertaintyMs: timingReliable ? Math.ceil(lastEvent!.uncertaintyMs) : null,
        bounceAmplitude, bounceReliable,
        transitionReliable, transitionScore: transitionReliable ? transitionScore : 0, speed,
        reason: timingReliable ? "Estimated movement onset compared with the nearest audio beat." : "Waiting for a clear movement onset near the beat.",
      };
    },
  };
}
