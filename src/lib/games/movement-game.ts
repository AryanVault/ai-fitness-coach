import { angle } from "../pose/math";
import type { ExerciseId, Landmark, TrackingFrame } from "../pose/types";

export type GameMode = "curl" | "pushup" | "cardio";
export type GameSide = "left" | "right";
type Point = {x:number;y:number};
export type GameTarget = Point & {radius:number;side:GameSide;hit:boolean};
export type GameSnapshot = {
  mode:GameMode; level:number; status:"calibrating"|"playing"|"tracking_paused"|"complete";
  calibrated:boolean; phase:"home"|"reach"|"return"; points:number; completed:number; goal:number;
  side:GameSide; message:string; calibrationProgress:number; targets:GameTarget[];
};
export const MOVEMENT_GAMES: Array<{id:GameMode;label:string;exercise:ExerciseId;description:string}> = [
  {id:"curl",label:"Curl bubbles",exercise:"bicep_curl",description:"Reach your bubble, then lower with control to collect it."},
  {id:"pushup",label:"Pushup levels",exercise:"pushup",description:"Build a level from complete, controlled pushups."},
  {id:"cardio",label:"Cardio reach",exercise:"jumping_jack",description:"Alternate hands. Reach, return, then switch."},
];
const length=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
function geometry(frame:TrackingFrame) {
  const points=frame.smoothedLandmarks;
  const aspect=frame.imageAspectRatio??1;
  const pixel=(i:number)=>({x:points[i].x*aspect,y:points[i].y});
  const shoulder={x:(pixel(11).x+pixel(12).x)/2,y:(pixel(11).y+pixel(12).y)/2};
  const hip={x:(pixel(23).x+pixel(24).x)/2,y:(pixel(23).y+pixel(24).y)/2};
  const scale=length(shoulder,hip);
  if(!Number.isFinite(scale)||scale<.04) return null;
  const down={x:(hip.x-shoulder.x)/scale,y:(hip.y-shoulder.y)/scale};
  const right={x:down.y,y:-down.x};
  const local=(i:number)=>{
    const p=pixel(i),x=(p.x-shoulder.x)/scale,y=(p.y-shoulder.y)/scale;
    return {x:x*right.x+y*right.y,y:x*down.x+y*down.y};
  };
  const image=(p:Point)=>({x:(shoulder.x+scale*(p.x*right.x+p.y*down.x))/aspect,y:shoulder.y+scale*(p.x*right.y+p.y*down.y)});
  return {scale,aspect,local,image,pixel};
}
type Body=NonNullable<ReturnType<typeof geometry>>;
type Sample={hand:Point;elbow:Point;angle:number;height:number;support:Point;ankle:Point};
function sample(body:Body,side:GameSide):Sample {
  const [s,e,w]=side==="left"?[11,13,15]:[12,14,16];
  return {hand:body.local(w),elbow:body.local(e),angle:angle(body.pixel(s),body.pixel(e),body.pixel(w)),height:(body.pixel(w).y-body.pixel(s).y)/body.scale,support:body.pixel(w),ankle:body.pixel(side==="left"?27:28)};
}

/** All thresholds are game interaction tolerances, not biomechanical diagnoses. */
export function createMovementGame(options:{mode:GameMode;level:number;side?:GameSide}) {
  const mode=options.mode,level=Math.max(1,Math.min(5,Math.round(options.level)));
  let side:GameSide=options.side??"left";
  let state:GameSnapshot={mode,level,status:"calibrating",calibrated:false,phase:"home",points:0,completed:0,goal:3+2*level,side,message:"Stand in view and hold a comfortable starting position.",calibrationProgress:0,targets:[]};
  let baseline:Record<GameSide,Sample>|null=null,peak:Record<GameSide,Sample>|null=null;
  let stableSince:number|null=null,rangeSince:number|null=null,homeSince:number|null=null,hitSince:number|null=null;
  let cycleStart:number|null=null,lastTimestamp:number|null=null;
  let previous:Sample|null=null,maxExcursion=0,rangeConfirmed=false;
  const clearCycle=()=>{homeSince=null;hitSince=null;cycleStart=null;state.phase="home";};
  function suspend(message:string) {
    clearCycle();state.targets=[];state.status="tracking_paused";state.message=message;
    if(!state.calibrated){baseline=null;peak=null;stableSince=null;rangeSince=null;rangeConfirmed=false;maxExcursion=0;previous=null;state.calibrationProgress=0;}
    return {...state};
  }
  function trustworthy(frame:TrackingFrame) {
    const indices=mode==="pushup"?(side==="left"?[11,12,13,15,23,24,27]:[11,12,14,16,23,24,28]):[11,12,13,14,15,16,23,24];
    const visible=(p?:Landmark)=>p && Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.visibility)&&p.visibility!>=.55;
    return Number.isFinite(frame.timestampMs)&&frame.frameQuality==="ready"&&frame.fps>=8&&(frame.frameAgeMs??0)<=350&&(frame.poseCount??1)<=1
      &&indices.every(i=>visible(frame.smoothedLandmarks[i])&&!frame.rejectedJoints?.includes(i))
      &&(mode==="pushup"?frame.view==="side":["front","angled"].includes(frame.view));
  }
  return {
    snapshot:()=>({...state}),
    interrupt:()=>suspend("Paused. Return to your starting position before the next move."),
    update(frame:TrackingFrame|null):GameSnapshot {
      if(state.status==="complete")return {...state};
      if(!frame||!trustworthy(frame))return suspend("Tracking paused. Keep the working joints visible and use the requested camera angle.");
      const now=frame.timestampMs;
      if(lastTimestamp!==null&&(now<=lastTimestamp||now-lastTimestamp>600))suspend("Tracking resumed. Start a fresh movement from home.");
      lastTimestamp=now;
      const body=geometry(frame);if(!body)return suspend("Show shoulders and hips clearly for body calibration.");
      const current={left:sample(body,"left"),right:sample(body,"right")};
      const active=current[side];
      if(mode==="pushup"){
        const [s,h,a]=side==="left"?[11,23,27]:[12,24,28];
        if(angle(body.pixel(s),body.pixel(h),body.pixel(a))<150)return suspend("Keep your shoulder, hip and ankle in one controlled line.");
        const shoulder=body.pixel(s),hip=body.pixel(h);
        if(Math.abs(hip.y-shoulder.y)>Math.abs(hip.x-shoulder.x))return suspend("Use a floor-pushup position with your body across the image. Keep the camera level and side-on.");
        if(active.height<.2)return suspend("Keep your support hand below your shoulder in the image.");
        if(baseline&&(length(active.support,baseline[side].support)/body.scale>.18||length(active.ankle,baseline[side].ankle)/body.scale>.18))return suspend("Keep your support hand and feet planted. Restart calibration if you move the camera or change position.");
      }
      if(!baseline){
        state.status="calibrating";state.message=mode==="pushup"?"Hold the top of your pushup in side view.":"Hold your arms comfortably down for calibration.";
        if((mode!=="cardio"&&active.angle<145)||(previous&&length(previous.hand,active.hand)>.12)){stableSince=null;}
        previous=active;
        if(mode!=="cardio"&&active.angle<145)return {...state};
        stableSince??=now;state.calibrationProgress=Math.min(40,(now-stableSince)/800*40);
        if(now-stableSince<800)return {...state};
        baseline=current;peak=current;stableSince=null;state.calibrationProgress=40;
      }
      if(!state.calibrated){
        state.status="calibrating";
        state.message=mode==="cardio"?"Practice once: reach both hands out comfortably, then bring them home.":mode==="pushup"?"Practice one comfortable pushup, then return to the top. This rep sets your range.":`Practice one comfortable ${side} curl, then lower. This rep sets your range.`;
        const excursion=mode==="pushup"?(baseline[side].angle-active.angle)/90:mode==="cardio"?Math.min(length(current.left.hand,baseline.left.hand),length(current.right.hand,baseline.right.hand)):length(active.hand,baseline[side].hand);
        if(excursion>maxExcursion){maxExcursion=excursion;peak=current;}
        const loweringObserved=mode!=="pushup"||active.height<baseline[side].height-.12;
        if(excursion>.45&&loweringObserved){rangeSince??=now;if(now-rangeSince>=100)rangeConfirmed=true;}else rangeSince=null;
        state.calibrationProgress=rangeConfirmed?80:40;
        const atHome=mode==="pushup"?active.angle>=baseline[side].angle-12:mode==="cardio"?length(current.left.hand,baseline.left.hand)<.18&&length(current.right.hand,baseline.right.hand)<.18:length(active.hand,baseline[side].hand)<.18;
        if(rangeConfirmed&&maxExcursion>.45&&atHome){
          homeSince??=now;
          if(now-homeSince>=150){state.calibrated=true;state.status="playing";state.calibrationProgress=100;clearCycle();}
        } else homeSince=null;
        if(!state.calibrated)return {...state};
      }
      state.status="playing";state.side=side;
      const home=baseline[side],target=peak![side];
      if(mode==="curl"&&length(active.elbow,home.elbow)>.3)return suspend("Bring your elbow back beside your body, then start again.");
      const atHome=mode==="pushup"?active.angle>=home.angle-12&&active.height>=home.height-.1:length(active.hand,home.hand)<.18;
      const atTarget=mode==="pushup"?active.angle<=target.angle+10&&active.height<=Math.min(target.height+.08,home.height-.12):length(active.hand,target.hand)<.2&&(mode!=="curl"||active.angle<=target.angle+15);
      if(state.phase==="home"){
        state.message="Return to your starting position and settle briefly.";
        if(atHome){homeSince??=now;if(now-homeSince>=120){state.phase="reach";cycleStart=now;}}else homeSince=null;
      }
      if(state.phase==="reach"){
        state.message=mode==="pushup"?`Lower toward your practiced range (${Math.round(target.angle)}°), then return.`:`Reach the ${side} target with control.`;
        if(atTarget){hitSince??=now;if(now-hitSince>=100){state.phase="return";homeSince=null;}}else hitSince=null;
      }
      if(state.phase==="return"){
        state.message="Target reached. Return with control to collect your points.";
        if(atHome){
          homeSince??=now;
          if(now-homeSince>=150&&cycleStart!==null&&now-cycleStart>=(mode==="cardio"?450:650)){
            state.points+=100;state.completed++;clearCycle();
            if(mode==="cardio")side=side==="left"?"right":"left";
            state.side=side;
            if(state.completed>=state.goal){state.status="complete";state.message=`Level ${level} complete. ${state.completed} controlled movements.`;state.targets=[];return {...state};}
            state.message="Collected. Settle at home for the next movement.";
          }
        }else homeSince=null;
      }
      const image=body.image(peak![side].hand);
      const radius=body.scale*.2;
      if(mode!=="pushup"&&(image.x-radius/body.aspect<.015||image.x+radius/body.aspect>.985||image.y-radius<.015||image.y+radius>.985))return suspend("Step toward the center so your entire target fits inside the camera.");
      state.targets=mode==="pushup"||state.phase==="home"?[]:[{...image,radius,side,hit:state.phase==="return"}];
      return {...state};
    },
  };
}
