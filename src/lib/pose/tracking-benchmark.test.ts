import { describe, expect, it } from "vitest";
import { evaluateTrackingReplay, type TrackingReplay } from "./tracking-benchmark";

function replay():TrackingReplay {
  const landmarks=Array.from({length:33},()=>({x:.5,y:.5,visibility:0}));
  for(const [i,x,y] of [[11,.4,.3],[12,.6,.3],[23,.4,.6],[24,.6,.6]])landmarks[i]={x,y,visibility:1};
  return {version:"tracking-comparison-v1",synthetic:true,annotationSource:"Synthetic test geometry",aspectRatio:1,joints:[11,12,23,24],frames:[{id:"a",landmarks}],predictions:{candidate:[{id:"a",landmarks:landmarks.map(p=>({...p})),inferenceMs:20}]}};
}
describe("paired tracking comparison",()=>{
  it("reports perfect predictions only when every labeled joint is observed",()=>{
    const report=evaluateTrackingReplay(replay()).models.candidate;
    expect(report.pckAt01).toBe(1);expect(report.coverage).toBe(1);expect(report.meanErrorTorsoUnits).toBe(0);
  });
  it("counts missing predictions as PCK failures rather than hiding them from the denominator",()=>{
    const data=replay();data.predictions.candidate[0].landmarks[11].visibility=0;
    const report=evaluateTrackingReplay(data).models.candidate;
    expect(report.pckAt01).toBe(.75);expect(report.missingJoints).toBe(1);expect(report.meanErrorTorsoUnits).toBe(0);
  });
  it("uses ground-truth body scale and the same frame IDs for every candidate",()=>{
    const data=replay();data.predictions.candidate[0].landmarks[11].x+=.06;
    expect(evaluateTrackingReplay(data).models.candidate.meanErrorTorsoUnits).toBeCloseTo(.05);
    data.predictions.candidate[0].id="unmatched";
    expect(evaluateTrackingReplay(data).models.candidate.coverage).toBe(0);
    expect(evaluateTrackingReplay(data).models.candidate.meanErrorTorsoUnits).toBeNull();
  });
  it("rejects duplicate frames, invalid metadata and missing annotation provenance",()=>{
    const data=replay();data.frames.push(data.frames[0]);expect(()=>evaluateTrackingReplay(data)).toThrow(/Duplicate/);
    expect(()=>evaluateTrackingReplay({...replay(),annotationSource:""})).toThrow();
  });
});
