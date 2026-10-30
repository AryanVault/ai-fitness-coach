"use client";
import { useEffect, useRef, useState } from "react";
import { createMovementGame, type GameMode, type GameSide, type GameSnapshot } from "@/lib/games/movement-game";
import type { TrackingFrame } from "@/lib/pose/types";

export function useMovementGame() {
  const engine=useRef<ReturnType<typeof createMovementGame>|null>(null);
  const active=useRef(false);
  const lastDelivery=useRef(0);
  const [mode,setMode]=useState<GameMode|null>(null);
  const [level,setLevel]=useState(1);
  const [side,setSide]=useState<GameSide>("left");
  const [playing,setPlaying]=useState(false);
  const [snapshot,setSnapshot]=useState<GameSnapshot|null>(null);
  const reset=(nextMode:GameMode|null,nextLevel=level,nextSide=side)=>{
    active.current=false;setPlaying(false);setMode(nextMode);setLevel(nextLevel);setSide(nextSide);
    engine.current=nextMode?createMovementGame({mode:nextMode,level:nextLevel,side:nextSide}):null;
    setSnapshot(engine.current?.snapshot()??null);
  };
  const pause=()=>{active.current=false;setPlaying(false);if(engine.current)setSnapshot(engine.current.interrupt());};
  useEffect(()=>{
    const tick=window.setInterval(()=>{
      if(active.current&&performance.now()-lastDelivery.current>600&&engine.current)setSnapshot(engine.current.update(null));
    },250);
    const hide=()=>{if(document.hidden){active.current=false;setPlaying(false);if(engine.current)setSnapshot(engine.current.interrupt());}};
    document.addEventListener("visibilitychange",hide);
    return()=>{window.clearInterval(tick);document.removeEventListener("visibilitychange",hide);};
  },[]);
  return {
    mode,level,side,playing,snapshot,
    select:(next:GameMode|null)=>reset(next,1),
    setLevel:(next:number)=>reset(mode,next),
    setSide:(next:GameSide)=>reset(mode,level,next),
    restart:()=>reset(mode,level),
    pause,
    start:()=>{lastDelivery.current=performance.now();active.current=true;setPlaying(true);},
    processFrame:(frame:TrackingFrame|null)=>{
      lastDelivery.current=performance.now();
      if(active.current&&engine.current){const next=engine.current.update(frame);setSnapshot(next);if(next.status==="complete"){active.current=false;setPlaying(false);}}
    },
    invalidate:()=>{if(engine.current){active.current=false;setPlaying(false);engine.current=createMovementGame({mode:engine.current.snapshot().mode,level:engine.current.snapshot().level,side:engine.current.snapshot().side});setSnapshot(engine.current.snapshot());}},
  };
}
