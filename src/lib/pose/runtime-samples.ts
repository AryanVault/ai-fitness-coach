import type { TrackingFrame } from "./types";

type Sample=Pick<TrackingFrame,"provider"|"modelQuality"|"delegate"|"inferenceLatencyMs">;
type Identity={provider:NonNullable<TrackingFrame["provider"]>;model:TrackingFrame["modelQuality"];delegate:TrackingFrame["delegate"]};

/** A fallback starts a new distribution; old model timings never change identity. */
export function createRuntimeSamples() {
  let identity:Identity|undefined;
  let values:number[]=[];
  return {
    reset(){identity=undefined;values=[];},
    add(frame:Sample|null){
      if(!frame||!Number.isFinite(frame.inferenceLatencyMs)||frame.inferenceLatencyMs!<0)return;
      const next={provider:frame.provider??"mediapipe",model:frame.modelQuality,delegate:frame.delegate};
      if(!identity||next.provider!==identity.provider||next.model!==identity.model||next.delegate!==identity.delegate)values=[];
      identity=next;values=[...values.slice(-599),frame.inferenceLatencyMs!];
    },
    report(){
      if(!identity||!values.length)return undefined;
      const sorted=[...values].sort((a,b)=>a-b);
      return {...identity,inferenceP50Ms:sorted[Math.floor((sorted.length-1)*.5)],inferenceP95Ms:sorted[Math.floor((sorted.length-1)*.95)],sampleCount:sorted.length};
    },
  };
}
