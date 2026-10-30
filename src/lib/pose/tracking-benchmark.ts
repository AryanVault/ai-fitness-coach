import { z } from "zod";
import type { Landmark } from "./types";

const landmark=z.object({x:z.number(),y:z.number(),visibility:z.number().min(0).max(1).optional(),z:z.number().optional()});
const observed=z.object({id:z.string().min(1),landmarks:z.array(landmark).length(33),inferenceMs:z.number().nonnegative().optional()});
export const trackingReplaySchema=z.object({
  version:z.literal("tracking-comparison-v1"),synthetic:z.boolean(),annotationSource:z.string().min(1),aspectRatio:z.number().positive(),
  joints:z.array(z.number().int().min(0).max(32)).min(1),
  frames:z.array(observed).min(1),predictions:z.record(z.string().min(1),z.array(observed)),
});
export type TrackingReplay=z.infer<typeof trackingReplaySchema>;
const visible=(p?:Landmark)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??0)>=.5;
const percentile=(values:number[],q:number)=>values.length?[...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*q)]:null;

/** Paired, torso-normalized 2D evaluation. Missing joints stay in the PCK denominator. */
export function evaluateTrackingReplay(input:TrackingReplay) {
  const data=trackingReplaySchema.parse(input);
  const unique=(items:Array<{id:string}>)=>{if(new Set(items.map(x=>x.id)).size!==items.length)throw new Error("Duplicate frame IDs");};
  unique(data.frames);
  const models:Record<string,{labeledJoints:number;observedJoints:number;missingJoints:number;coverage:number;pckAt01:number;meanErrorTorsoUnits:number|null;errorP95TorsoUnits:number|null;inferenceP50Ms:number|null;inferenceP95Ms:number|null}>={};
  for(const [model,predictions] of Object.entries(data.predictions)){
    unique(predictions);
    const byId=new Map(predictions.map(frame=>[frame.id,frame]));
    const errors:number[]=[],latencies:number[]=[];
    let total=0,correct=0;
    for(const truth of data.frames){
      const anchors=[11,12,23,24].map(i=>truth.landmarks[i]);
      if(!anchors.every(visible))throw new Error(`Frame ${truth.id} needs annotated shoulders and hips for normalization`);
      const a={x:(anchors[0].x+anchors[1].x)/2,y:(anchors[0].y+anchors[1].y)/2};
      const b={x:(anchors[2].x+anchors[3].x)/2,y:(anchors[2].y+anchors[3].y)/2};
      const scale=Math.hypot((a.x-b.x)*data.aspectRatio,a.y-b.y);
      if(scale<.001)throw new Error(`Frame ${truth.id} has no measurable torso scale`);
      const predicted=byId.get(truth.id);
      if(predicted?.inferenceMs!==undefined)latencies.push(predicted.inferenceMs);
      for(const index of new Set(data.joints)){
        const expected=truth.landmarks[index];if(!visible(expected))continue;
        total++;
        const actual=predicted?.landmarks[index];if(!visible(actual))continue;
        const error=Math.hypot((actual!.x-expected.x)*data.aspectRatio,actual!.y-expected.y)/scale;
        errors.push(error);if(error<=.1)correct++;
      }
    }
    models[model]={labeledJoints:total,observedJoints:errors.length,missingJoints:total-errors.length,coverage:total?errors.length/total:0,pckAt01:total?correct/total:0,meanErrorTorsoUnits:errors.length?errors.reduce((sum,n)=>sum+n,0)/errors.length:null,errorP95TorsoUnits:percentile(errors,.95),inferenceP50Ms:percentile(latencies,.5),inferenceP95Ms:percentile(latencies,.95)};
  }
  return {version:data.version,synthetic:data.synthetic,annotationSource:data.annotationSource,frameCount:data.frames.length,threshold:"PCK at 0.1 ground-truth torso lengths; missing joints count as failures",interpretation:data.synthetic?"Synthetic software regression only. This is not model accuracy evidence.":"Accuracy relative to the supplied 2D annotations only. Inference timings exclude capture and display latency.",models};
}
