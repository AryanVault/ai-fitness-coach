import { afterEach, describe, expect, it, vi } from "vitest";
import { createPoseTrackingEngine } from "./tracking-engine";
describe("worker inference bridge",()=>{
 afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
 it("falls back to balanced tracking after an alternative provider fails during inference",async()=>{
  const paths:string[]=[];
  class TestWorker {
   onmessage:((event:{data:unknown})=>void)|null=null;onerror:unknown;terminate=vi.fn();path:string;
   constructor(path:URL){this.path=String(path);paths.push(this.path);}
   postMessage(message:{id:number;type:string}){queueMicrotask(()=>this.onmessage?.({data:{id:message.id,...(message.type==="frame"?this.path.includes("movenet")?{error:"Inference failed"}:{landmarks:[],latencyMs:10}:{})}}));}
  }
  vi.stubGlobal("Worker",TestWorker);vi.stubGlobal("window",{location:{origin:"https://test.example"}});
  vi.stubGlobal("createImageBitmap",vi.fn(async()=>({close:vi.fn()})));
  const engine=createPoseTrackingEngine({});await engine.setMode("alternative");
  const frame={video:{} as HTMLVideoElement,timestampMs:1000,frameIndex:1,fps:30};
  await expect(engine.processFrame(frame,"bicep_curl")).resolves.toBeNull();
  await expect(engine.processFrame({...frame,timestampMs:1100},"bicep_curl")).resolves.toBeNull();
  expect(paths.some(path=>path.includes("movenet"))).toBe(true);expect(paths.at(-1)).toContain("mediapipe");await engine.stop();
 });
 it("allows cold WASM inference to warm up, then enforces the normal frame deadline",async()=>{
  vi.useFakeTimers();
  let current: TestWorker;
  let frameId=0;
  class TestWorker {
   onmessage:((event:{data:unknown})=>void)|null=null;onerror:unknown;terminate=vi.fn();
   constructor(){current=this;}
   postMessage(message:{id:number;type:string}) {
    if(message.type==="init")queueMicrotask(()=>this.onmessage?.({data:{id:message.id}}));
    else frameId=message.id;
   }
  }
  vi.stubGlobal("Worker",TestWorker);vi.stubGlobal("window",{location:{origin:"https://test.example"}});
  vi.stubGlobal("createImageBitmap",vi.fn(async()=>({close:vi.fn()})));
  const engine=createPoseTrackingEngine({});
  const frame={video:{} as HTMLVideoElement,timestampMs:1000,frameIndex:1,fps:30};
  const first=engine.processFrame(frame,"squat");
  const firstResult=expect(first).resolves.toBeNull();
  await vi.advanceTimersByTimeAsync(6000);
  expect(current!.terminate).not.toHaveBeenCalled();
  current!.onmessage?.({data:{id:frameId,landmarks:[],latencyMs:6000}});
  await firstResult;
  const next=engine.processFrame({...frame,timestampMs:2000,frameIndex:2},"squat");
  const timedOut=expect(next).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(5001);
  await timedOut;
  expect(current!.terminate).toHaveBeenCalledOnce();
  await engine.stop();
 });
 it("retries the lite model after full initialization fails",async()=>{
  const qualities:string[]=[];const terminate=vi.fn();
  class TestWorker {
   onmessage:((event:{data:unknown})=>void)|null=null;onerror:unknown;
   terminate=terminate;
   postMessage(message:{id:number;type:string;quality?:string}) {
    if(message.quality)qualities.push(message.quality);
    queueMicrotask(()=>this.onmessage?.({data:{id:message.id,...(message.quality==="full"?{error:"Full asset unavailable"}:message.type==="frame"?{landmarks:[],latencyMs:10}:{})}}));
   }
  }
  vi.stubGlobal("Worker",TestWorker);vi.stubGlobal("window",{location:{origin:"https://test.example"}});
  vi.stubGlobal("createImageBitmap",vi.fn(async()=>({close:vi.fn()})));
  const engine=createPoseTrackingEngine({});
  const frame={video:{} as HTMLVideoElement,timestampMs:1000,frameIndex:1,fps:30};
  expect(await engine.processFrame(frame,"squat")).toBeNull();expect(qualities).toEqual(["full","lite"]);
  await engine.stop();expect(terminate).toHaveBeenCalledOnce();
 });
 it("keeps one initialization in flight and does not restart after stopping",async()=>{
  const messages:unknown[]=[];
  class TestWorker {onmessage:unknown;onerror:unknown;terminate=vi.fn();postMessage(message:unknown){messages.push(message);}}
  vi.stubGlobal("Worker",TestWorker);vi.stubGlobal("window",{location:{origin:"https://test.example"}});
  const engine=createPoseTrackingEngine({});const frame={video:{} as HTMLVideoElement,timestampMs:1000,frameIndex:1,fps:30};
  const first=engine.processFrame(frame,"squat");const rejected=expect(first).rejects.toThrow("stopped");
  expect(await engine.processFrame(frame,"squat")).toBeNull();expect(messages).toHaveLength(1);
  await engine.stop();await rejected;expect(messages).toHaveLength(1);
 });
});
