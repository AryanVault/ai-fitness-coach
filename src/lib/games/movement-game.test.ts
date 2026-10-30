import { describe, expect, it } from "vitest";
import type { TrackingFrame } from "../pose/types";
import { createMovementGame } from "./movement-game";
import { buildTrackingFrame } from "../pose/confidence";

function frame(t:number, bend=0, mode="curl", scale=1):TrackingFrame {
  const p=Array.from({length:33},()=>({x:.5,y:.15,visibility:.99}));
  for(const [i,x,y] of [[11,.4,.3],[12,.6,.3],[13,.4,.45],[14,.6,.45],[15,.4,.6],[16,.6,.6],[23,.42,.6],[24,.58,.6],[25,.42,.75],[26,.58,.75],[27,.42,.9],[28,.58,.9]])p[i]={x,y,visibility:.99};
  if(mode==="cardio") {p[15]={x:.4-bend*.22,y:.6-bend*.32,visibility:.99};p[16]={x:.6+bend*.22,y:.6-bend*.32,visibility:.99};}
  else {
    const theta=bend*Math.PI/180;
    p[15]={x:.4+.15*Math.sin(theta),y:.45+.15*Math.cos(theta),visibility:.99};
    p[16]={x:.6-.15*Math.sin(theta),y:.45+.15*Math.cos(theta),visibility:.99};
  }
  if(mode==="pushup"){
    const progress=bend/120;
    for(const offset of [0,1]){
      p[11+offset]={x:.35+offset*.02,y:.3+.18*progress,visibility:.99};
      p[13+offset]={x:.35+offset*.02-.1*progress,y:.475+.09*progress,visibility:.99};
      p[15+offset]={x:.35+offset*.02,y:.65,visibility:.99};
      p[23+offset]={x:.58+offset*.02,y:.3+.09*progress,visibility:.99};
      p[25+offset]={x:.72+offset*.02,y:.3+.045*progress,visibility:.99};
      p[27+offset]={x:.85+offset*.02,y:.3,visibility:.99};
    }
  }
  const points=p.map(v=>({...v,x:.5+(v.x-.5)*scale,y:.5+(v.y-.5)*scale}));
  if(mode==="pushup")return buildTrackingFrame({exerciseId:"pushup",rawLandmarks:points,previousSmoothed:null,filteredLandmarks:points,timestampMs:t,frameIndex:t,fps:30,brightness:120,imageAspectRatio:1});
  return {timestampMs:t,frameIndex:t,fps:30,rawLandmarks:points,smoothedLandmarks:points,worldLandmarks:[],imageAspectRatio:1,avgVisibility:.99,posePresence:.99,trackingConfidence:.99,frameQuality:"ready",frameQualityMessage:"Ready",view:mode==="pushup"?"side":"front",viewMessage:"Ready",brightness:120,motion:0,reliability:{leftArm:true,rightArm:true,trunk:true},dominantSide:"both"};
}
function calibrate(game:ReturnType<typeof createMovementGame>,mode="curl",scale=1){
  for(const t of [0,200,400,600,800,1000])game.update(frame(t,0,mode,scale));
  const bend=mode==="cardio"?1:120;
  game.update(frame(1300,bend,mode,scale));game.update(frame(1500,bend,mode,scale));
  game.update(frame(1800,0,mode,scale));return game.update(frame(2000,0,mode,scale));
}
describe("calibrated movement games",()=>{
  it("learns a comfortable curl target, then scores reach plus controlled return once",()=>{
    const game=createMovementGame({mode:"curl",level:1});
    expect(calibrate(game).calibrated).toBe(true);
    game.update(frame(2200));game.update(frame(2500,120));
    expect(game.update(frame(2700,120)).points).toBe(0);
    game.update(frame(3000));const result=game.update(frame(3200));
    expect(result.completed).toBe(1);expect(result.points).toBe(100);
    for(let t=3300;t<5000;t+=100)expect(game.update(frame(t)).points).toBe(100);
  });
  it("cannot score stationary poses or calibration movements",()=>{
    const game=createMovementGame({mode:"curl",level:1});
    for(let t=0;t<5000;t+=100)expect(game.update(frame(t)).points).toBe(0);
    expect(game.snapshot().calibrated).toBe(false);
  });
  it("discards a target hit interrupted by missing joints or a time gap",()=>{
    for(const interrupt of ["hidden","gap"]){
      const game=createMovementGame({mode:"curl",level:1});calibrate(game);game.update(frame(2200));game.update(frame(2500,120));game.update(frame(2700,120));
      if(interrupt==="hidden"){const hidden=frame(2800,120);hidden.smoothedLandmarks[15].visibility=0;game.update(hidden);}
      else game.update(frame(4000,120));
      expect(game.update(frame(4200)).points).toBe(0);
    }
  });
  it("normalizes targets to body size and ignores global translation",()=>{
    for(const scale of [.6,1]){
      const game=createMovementGame({mode:"curl",level:1});expect(calibrate(game,"curl",scale).calibrated).toBe(true);
      for(const t of [2200,2400,2600]){
        const moved=frame(t,0,"curl",scale);moved.smoothedLandmarks=moved.smoothedLandmarks.map(p=>({...p,x:p.x+.1}));
        expect(game.update(moved).points).toBe(0);
      }
    }
  });
  it("alternates cardio hands and requires a return between hits",()=>{
    const game=createMovementGame({mode:"cardio",level:1});expect(calibrate(game,"cardio").calibrated).toBe(true);
    game.update(frame(2200,0,"cardio"));game.update(frame(2500,1,"cardio"));game.update(frame(2700,1,"cardio"));
    for(const t of [2800,2900])expect(game.update(frame(t,1,"cardio")).points).toBe(0);
    game.update(frame(3100,0,"cardio"));const result=game.update(frame(3300,0,"cardio"));
    expect(result.completed).toBe(1);expect(result.side).toBe("right");
  });
  it("pauses on stale frames and does not preserve an unfinished cycle",()=>{
    const game=createMovementGame({mode:"curl",level:1});calibrate(game);
    expect(game.update({...frame(2200),frameAgeMs:900}).status).toBe("tracking_paused");
    expect(game.update(null).points).toBe(0);
  });
  it("counts pushups only after reaching the practiced depth and returning to the top",()=>{
    const game=createMovementGame({mode:"pushup",level:1});expect(calibrate(game,"pushup").calibrated).toBe(true);
    game.update(frame(2200,0,"pushup"));game.update(frame(2500,120,"pushup"));game.update(frame(2700,120,"pushup"));
    game.update(frame(3000,0,"pushup"));expect(game.update(frame(3200,0,"pushup")).completed).toBe(1);
  });
  it("does not calibrate cardio if only one hand practices a reach",()=>{
    const game=createMovementGame({mode:"cardio",level:1});
    for(const t of [0,200,400,600,800,1000])game.update(frame(t,0,"cardio"));
    for(const t of [1300,1500]){const f=frame(t,1,"cardio");f.smoothedLandmarks[16]=frame(t,0,"cardio").smoothedLandmarks[16];game.update(f);}
    game.update(frame(1800,0,"cardio"));expect(game.update(frame(2000,0,"cardio")).calibrated).toBe(false);
  });
  it("rejects upright arm curls masquerading as pushups even when view is side",()=>{
    const game=createMovementGame({mode:"pushup",level:1});
    for(let t=0;t<3000;t+=100){const f=frame(t,t>1000&&t<1800?120:0);f.view="side";expect(game.update(f).calibrated).toBe(false);}
    expect(game.snapshot().points).toBe(0);
  });
  it("rejects forearm waving while a horizontal torso never lowers",()=>{
    const game=createMovementGame({mode:"pushup",level:1});
    for(const t of [0,200,400,600,800,1000])game.update(frame(t,0,"pushup"));
    const fake=(t:number)=>{const f=frame(t,120,"pushup");f.smoothedLandmarks[11].y=.3;f.smoothedLandmarks[23].y=.3;f.smoothedLandmarks[15].x+=.3;return f;};
    game.update(fake(1300));game.update(fake(1500));game.update(frame(1800,0,"pushup"));
    expect(game.update(frame(2000,0,"pushup")).calibrated).toBe(false);
  });
});
