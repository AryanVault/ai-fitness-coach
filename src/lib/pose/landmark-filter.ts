import type { Landmark } from "@/lib/pose/types";

// One Euro filtering: cutoff follows speed, dt is measured in seconds.
// Visibility remains unsmoothed so stale positions never imply fresh evidence.
export function createLandmarkFilter() {
  let previous: Landmark[] | null = null;
  let raw: Landmark[] | null = null;
  let velocity: Array<{ x: number; y: number; z: number }> = [];
  let lastMs: number | null = null;
  const alpha = (cutoff: number, dt: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
  const reset = () => { previous = null; raw = null; velocity = []; lastMs = null; };
  return {
    reset,
    update(points: Landmark[], timestampMs: number): Landmark[] {
      const dt = lastMs === null ? 0 : (timestampMs - lastMs) / 1000;
      if (!previous || !raw || points.length !== previous.length || dt <= 0 || dt > .5) {
        previous = points.map(p => ({ ...p })); raw = points.map(p => ({ ...p }));
        velocity = points.map(() => ({ x: 0, y: 0, z: 0 })); lastMs = timestampMs;
        return previous;
      }
      const old = previous; const oldRaw = raw;
      previous = points.map((p, i) => {
        if ((p.visibility ?? 0) < .45 || (oldRaw[i].visibility ?? 0) < .45) {
          velocity[i] = { x: 0, y: 0, z: 0 }; return { ...p };
        }
        const result: Landmark = { ...p };
        for (const axis of ["x", "y", "z"] as const) {
          const derivative = ((p[axis] ?? 0) - (oldRaw[i][axis] ?? 0)) / dt;
          velocity[i][axis] += alpha(1, dt) * (derivative - velocity[i][axis]);
          const blend = alpha(1.7 + .6 * Math.abs(velocity[i][axis]), dt);
          result[axis] = (old[i][axis] ?? 0) + blend * ((p[axis] ?? 0) - (old[i][axis] ?? 0));
        }
        return result;
      });
      raw = points.map(p => ({ ...p })); lastMs = timestampMs;
      return previous;
    },
  };
}
