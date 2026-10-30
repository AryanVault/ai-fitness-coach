import type { Landmark } from "./types";

/** Orthographic image plane: depth never changes registration with the video. */
export function landmarkToScene(point: Landmark, aspectRatio: number, mirror: boolean) {
  return {
    x: (mirror ? .5 - point.x : point.x - .5) * 2 * aspectRatio,
    y: (.5 - point.y) * 2,
    z: -Math.max(-2, Math.min(2, point.z ?? 0)) * .15,
  };
}
