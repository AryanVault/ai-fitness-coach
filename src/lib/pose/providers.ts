import type { Landmark } from "./types";

export type TrackingMode = "auto" | "detail" | "alternative";
export type PoseProvider = "mediapipe" | "movenet";
export type ModelQuality = "full" | "lite" | "heavy" | "thunder";
export const TRACKING_MODES = [
  {id:"auto",label:"Balanced",detail:"MediaPipe Full with a lighter fallback."},
  {id:"detail",label:"High detail",detail:"MediaPipe Heavy. Higher device cost; accuracy needs comparison."},
  {id:"alternative",label:"MoveNet Thunder",detail:"Independent 2D model. Body joints only; no measured depth or fingers. Keep one person in frame."},
] as const;

export function modelForMode(mode: TrackingMode): {provider:PoseProvider; quality:ModelQuality} {
  if (mode === "detail") return {provider:"mediapipe",quality:"heavy"};
  if (mode === "alternative") return {provider:"movenet",quality:"thunder"};
  return {provider:"mediapipe",quality:"full"};
}

const COCO_TO_CANONICAL = [0,2,5,7,8,11,12,13,14,15,16,23,24,25,26,27,28];

/** Decode [y,x,score] predictions from an aspect-preserving, centered 256px input. */
export function decodeMoveNet(output: ArrayLike<number>, image: {width:number;height:number}): Landmark[] {
  if (output.length!==51 || Array.from(output).some(n=>!Number.isFinite(n)) || image.width<=0 || image.height<=0) throw new Error("Invalid MoveNet output");
  const scale=256/Math.max(image.width,image.height);
  const width=Math.round(image.width*scale), height=Math.round(image.height*scale);
  const left=Math.floor((256-width)/2),top=Math.floor((256-height)/2);
  const points:Landmark[]=Array.from({length:33},()=>({x:0,y:0,visibility:0}));
  COCO_TO_CANONICAL.forEach((index,i)=>{
    const x=(output[i*3+1]*256-left)/width;
    const y=(output[i*3]*256-top)/height;
    points[index]={x,y,visibility:x<0||x>1||y<0||y>1?0:Math.max(0,Math.min(1,output[i*3+2]))};
  });
  return points;
}
