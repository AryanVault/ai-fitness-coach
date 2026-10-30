import { describe, expect, it } from "vitest";
import { createObservationGuard } from "./observation-guard";

function body() {
  const p = Array.from({ length: 33 }, () => ({ x: .5, y: .5, visibility: .99 }));
  for (const [i, x, y] of [[11,.4,.3],[12,.6,.3],[23,.42,.6],[24,.58,.6],[15,.3,.5]]) p[i] = { x,y,visibility:.99 };
  return p;
}
describe("fresh observation validation", () => {
  it("rejects an isolated wrist teleport without changing raw input", () => {
    const guard = createObservationGuard(); guard.update(body(), 1000, 16/9);
    const jumped = body(); jumped[15].x = .95;
    const result = guard.update(jumped, 1033, 16/9);
    expect(result.rejected).toContain(15);
    expect(result.landmarks[15].visibility).toBe(0);
    expect(jumped[15].visibility).toBe(.99);
    expect(guard.update(body(), 1066, 16/9).rejected).not.toContain(15);
  });
  it("accepts coherent whole-body translation and fresh evidence after a gap", () => {
    const guard = createObservationGuard(); guard.update(body(), 1000, 1);
    const moved = body().map(p => ({ ...p, x: p.x + .2 }));
    expect(guard.update(moved, 1033, 1).rejected).toEqual([]);
    expect(guard.update(body(), 2000, 1).rejected).toEqual([]);
  });
  it("reacquires a consistently relocated joint without accepting a one-frame spike", () => {
    const guard = createObservationGuard(); guard.update(body(), 1000, 1);
    const moved = body(); moved[15].x = .9;
    expect(guard.update(moved, 1033, 1).rejected).toContain(15);
    expect(guard.update(moved, 1066, 1).rejected).not.toContain(15);
  });
  it("never promotes invalid or missing evidence to visible joints", () => {
    const p = body(); p[15].x = NaN; p[16].visibility = 0;
    const result = createObservationGuard().update(p, 0, 1);
    expect(result.rejected).toContain(15);
    expect(result.landmarks.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    expect(result.landmarks[15].visibility).toBe(0);
    expect(result.landmarks[16].visibility).toBe(0);
  });
  it("does not let a corrupted shoulder enlarge its own jump tolerance",()=>{
    const guard=createObservationGuard();guard.update(body(),1000,16/9);
    const moved=body();moved[11]={x:.98,y:.01,visibility:.99};
    expect(guard.update(moved,1033,16/9).rejected).toContain(11);
  });
});
