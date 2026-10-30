import { describe, expect, it } from "vitest";
import { landmarkToScene } from "./projection";

describe("image-registered depth projection", () => {
  it("maps image corners and center onto the orthographic image plane", () => {
    for (const aspect of [16 / 9, 3 / 4]) {
      expect(landmarkToScene({ x: 0, y: 0 }, aspect, false)).toMatchObject({ x: -aspect, y: 1 });
      expect(landmarkToScene({ x: 1, y: 1 }, aspect, false)).toMatchObject({ x: aspect, y: -1 });
      expect(landmarkToScene({ x: .5, y: .5 }, aspect, true)).toMatchObject({ x: 0, y: 0 });
    }
  });
  it("mirrors only the horizontal coordinate and never shifts xy with depth", () => {
    const p = { x: .2, y: .7, z: .8 };
    const normal = landmarkToScene(p, 16 / 9, false);
    const mirrored = landmarkToScene(p, 16 / 9, true);
    expect(normal.x).toBe(-mirrored.x);
    expect(normal.y).toBe(mirrored.y);
    expect(normal.x).toBe(landmarkToScene({ ...p, z: -.8 }, 16 / 9, false).x);
  });
});
