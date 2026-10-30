import type { Landmark } from "./types";

const visible = (p?: Landmark) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.visibility) && p.visibility! >= .45;
const median = (values: number[]) => values.length ? [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)] : 0;

export function imageBodyScale(points: Landmark[], aspectRatio: number) {
  const lengths = [[11,23],[12,24]].flatMap(([a,b]) => visible(points[a]) && visible(points[b])
    ? [Math.hypot((points[a].x-points[b].x)*aspectRatio,points[a].y-points[b].y)] : []);
  return Math.max(.08, median(lengths) || .3);
}

/** Suppress outliers; never replace a measurement with a predicted visible joint. */
export function createObservationGuard() {
  let previous: Landmark[] | null = null;
  let candidates: Landmark[] | null = null;
  let lastMs: number | null = null;
  const reset = () => { previous=null; candidates=null; lastMs=null; };
  return {
    reset,
    update(points: Landmark[], timestampMs: number, aspectRatio: number) {
      const dt = lastMs === null ? 0 : (timestampMs-lastMs)/1000;
      if (dt<=0 || dt>.5) reset();
      const scale = imageBodyScale(points,aspectRatio);
      const anchors = [11,12,23,24].filter(i=>visible(points[i]) && visible(previous?.[i]));
      const shiftX = anchors.length >= 3 ? median(anchors.map(i=>(points[i].x-previous![i].x)*aspectRatio)) : 0;
      const shiftY = anchors.length >= 3 ? median(anchors.map(i=>points[i].y-previous![i].y)) : 0;
      const rejected: number[] = [];
      const landmarks = points.map((point,i) => {
        const valid = Number.isFinite(point.x) && Number.isFinite(point.y) && (point.z===undefined || Number.isFinite(point.z)) && Number.isFinite(point.visibility) && point.visibility!>=0 && point.visibility!<=1;
        const old = previous?.[i];
        const residual = old ? Math.hypot((point.x-old.x)*aspectRatio-shiftX,point.y-old.y-shiftY)/scale : 0;
        const candidate = candidates?.[i];
        const confirmed = visible(candidate) && Math.hypot((point.x-candidate!.x)*aspectRatio,point.y-candidate!.y)/scale < .15;
        if (!valid || (visible(point) && visible(old) && residual > .12+8*dt && !confirmed)) {
          rejected.push(i);
          return { ...point, x: Number.isFinite(point.x)?point.x:0, y: Number.isFinite(point.y)?point.y:0, z: Number.isFinite(point.z)?point.z:undefined, visibility:0 };
        }
        return { ...point };
      });
      previous = landmarks.map((p,i)=>rejected.includes(i) && previous?.[i] ? {...previous[i]} : {...p});
      candidates = points.map(p=>({...p})); lastMs=timestampMs;
      return { landmarks, rejected, bodyScale:scale };
    },
  };
}
