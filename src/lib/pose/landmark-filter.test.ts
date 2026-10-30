import { describe, expect, it } from "vitest";
import { createLandmarkFilter } from "./landmark-filter";
describe("timestamp-aware adaptive filter", () => {
  it("uses the same body-relative response at different image scales and aspect ratios", () => {
    const simulate = (scale: number, aspect: number) => {
      const filter = createLandmarkFilter(); let x = .5;
      for (let i=0;i<=30;i++) x = filter.update([{x:.5+scale/aspect*i/30,y:.5,visibility:.99}], i*1000/30, {aspectRatio:aspect,bodyScale:scale})[0].x;
      return (x-.5)*aspect/scale;
    };
    expect(Math.abs(simulate(.1,16/9)-simulate(.3,3/4))).toBeLessThan(.001);
  });
  it("lets display filtering respond faster without changing current visibility", () => {
    const analysis = createLandmarkFilter(); const display = createLandmarkFilter({minCutoff:6});
    analysis.update([{x:0,y:0,visibility:.99}],0); display.update([{x:0,y:0,visibility:.99}],0);
    expect(display.update([{x:.1,y:0,visibility:.8}],33)[0].x).toBeGreaterThan(analysis.update([{x:.1,y:0,visibility:.8}],33)[0].x);
    expect(display.update([{x:.1,y:0,visibility:0}],66)[0].visibility).toBe(0);
  });
  it("does not invent a depth coordinate for 2D-only providers", () => {
    const filter=createLandmarkFilter();filter.update([{x:0,y:0,visibility:.99}],0);
    expect(filter.update([{x:.1,y:.1,visibility:.99}],33)[0].z).toBeUndefined();
  });
  it("has similar response across 15 and 30 Hz", () => {
    const simulate = (hz: number) => {
      const filter = createLandmarkFilter(); let result = [{x: 0, y: 0, visibility: .99}];
      filter.update(result, 0);
      for(let i=1;i<=hz;i++) result = filter.update([{x: i/hz, y: 0, visibility: .99}], i*1000/hz).map(p => ({...p, visibility: p.visibility ?? 0}));
      return result[0].x;
    };
    expect(Math.abs(simulate(15) - simulate(30))).toBeLessThan(.035);
  });
  it("resets after time reversal, gaps and hidden joint reacquisition", () => {
    const filter = createLandmarkFilter();
    filter.update([{x: 0,y: 0,visibility: .99}],100);
    expect(filter.update([{x: 1,y: 0,visibility: 0}],133)[0]).toMatchObject({x:1,visibility:0});
    expect(filter.update([{x: .5,y: 0,visibility: .99}],166)[0].x).toBe(.5);
    expect(filter.update([{x: 1,y: 0,visibility: .99}],1000)[0].x).toBe(1);
    expect(filter.update([{x: 0,y: 0,visibility: .99}],500)[0].x).toBe(0);
  });
});
