import type { DanceRoutinePack, DanceRoutineSegment, DanceRoutineTargetPoint } from "./types";

export function referenceSegmentAt(routine: DanceRoutinePack, elapsedMs: number): DanceRoutineSegment | undefined {
  const loopMs = routine.durationMs > 0 ? ((elapsedMs % routine.durationMs) + routine.durationMs) % routine.durationMs : Math.max(0, elapsedMs);
  const segment = routine.segments.find(s => loopMs >= s.startMs && loopMs < s.endMs) ?? routine.segments[0];
  if (!segment?.referenceKeyframes?.length) return segment;
  const frames = segment.referenceKeyframes.filter(f => Number.isFinite(f.timeMs)).toSorted((a, b) => a.timeMs - b.timeMs);
  if (!frames.length) return segment;
  const localMs = loopMs - segment.startMs;
  const before = frames.findLast(f => f.timeMs <= localMs) ?? frames[0];
  const after = frames.find(f => f.timeMs >= localMs) ?? frames[frames.length - 1];
  const mix = after.timeMs === before.timeMs ? 0 : (localMs - before.timeMs) / (after.timeMs - before.timeMs);
  const targetLandmarks = { ...segment.targetLandmarks };
  for (const name of Object.keys(before.targetLandmarks) as DanceRoutineTargetPoint[]) {
    const a = before.targetLandmarks[name]; const b = after.targetLandmarks[name];
    if (a && b && [a.x, a.y, b.x, b.y].every(Number.isFinite)) targetLandmarks[name] = { x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix };
  }
  return { ...segment, targetLandmarks };
}
