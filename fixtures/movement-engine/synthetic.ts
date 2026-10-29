import type { MovementReplay } from "../../src/lib/dance/replay-benchmark";

function points(amount: number, scale: number) {
  const landmarks = Array.from({length:33}, () => ({x:.5,y:.5,visibility:.99}));
  for(const [i,x,y] of [[11,.4,.25],[12,.6,.25],[15,.28-amount,.4],[16,.72+amount,.4],[23,.44,.5],[24,.56,.5],[27,.44,.9],[28,.56,.9]]) landmarks[i] = {x:.5+(x-.5)*scale,y:.5+(y-.5)*scale,visibility:.99};
  return landmarks;
}

export const syntheticMovementReplay: MovementReplay = {
  version: "movement-replay-v1",
  cases: [
    ...[15,30].flatMap(hz => [.5,1].map(scale => {
      const onsetFrame = Math.round(.5*hz);
      return {
        id: `onset-${hz}hz-scale-${scale}`, synthetic: true, annotationSource: "Programmatically generated isolated wrist excursion", device: "synthetic geometry", bpm:120,
        expectedOnsetsMs: [(onsetFrame-.5)*1000/hz],
        frames: Array.from({length:hz*3},(_,i) => ({timestampMs:i*1000/hz,routineMs:i*1000/hz,aspectRatio:1,synchronized:true,landmarks:points(i >= onsetFrame ? .06 : 0,scale)})),
      };
    })),
    {id:"stationary",synthetic:true,annotationSource:"Programmatically generated stationary pose",device:"synthetic geometry",bpm:120,expectedOnsetsMs:[],frames:Array.from({length:90},(_,i)=>({timestampMs:i*1000/30,routineMs:i*1000/30,aspectRatio:1,synchronized:true,landmarks:points(0,1)}))},
  ],
};
