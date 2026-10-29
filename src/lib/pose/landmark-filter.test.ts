import { describe, expect, it } from "vitest";
import { createLandmarkFilter } from "./landmark-filter";
describe("timestamp-aware adaptive filter", () => {
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
