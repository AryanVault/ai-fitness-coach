import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCameraController } from "./controller";
describe("camera lifecycle",()=>{
 const track={stop:vi.fn(),addEventListener:vi.fn(),getSettings:()=>({}),applyConstraints:vi.fn()};
 const stream={getTracks:()=>[track],getVideoTracks:()=>[track]} as unknown as MediaStream;
 let video:HTMLVideoElement;
 let animationCallback: (now: number) => Promise<void>;
 let callback:(now:number,metadata:unknown)=>Promise<void>;
 beforeEach(()=>{
  vi.clearAllMocks();
  vi.stubGlobal("document",{hidden:false,addEventListener:vi.fn(),removeEventListener:vi.fn()});
  vi.stubGlobal("window",{addEventListener:vi.fn(),removeEventListener:vi.fn(),cancelAnimationFrame:vi.fn(),requestAnimationFrame:vi.fn(fn=>{animationCallback=fn;return 2;})});
  vi.stubGlobal("navigator",{mediaDevices:{getUserMedia:vi.fn().mockResolvedValue(stream)}});
  video={srcObject:null,play:vi.fn().mockResolvedValue(undefined),requestVideoFrameCallback:vi.fn(fn=>{callback=fn;return 1;}),cancelVideoFrameCallback:vi.fn(),currentTime:0,videoWidth:640,videoHeight:360} as unknown as HTMLVideoElement;
 });
 afterEach(()=>vi.unstubAllGlobals());
 it("reports an actually acquired rear camera without mirroring when front preference falls back",async()=>{
  const rearTrack={...track,getSettings:()=>({facingMode:"environment"})};
  vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue({getTracks:()=>[rearTrack],getVideoTracks:()=>[rearTrack]} as unknown as MediaStream);
  const controller=createCameraController({video,onFrame:vi.fn()});
  expect((await controller.start()).profile).toMatchObject({facingMode:"environment",mirroredPreview:false});
  expect(controller.getProfile().facingMode).toBe("environment");controller.stop();
 });
 it("ignores a retired camera track ending after a replacement stream starts",async()=>{
  const disconnect=vi.fn();const controller=createCameraController({video,onFrame:vi.fn(),onDisconnect:disconnect});
  await controller.start();
  const ended=track.addEventListener.mock.calls.find(call=>call[0]==="ended")?.[1] as unknown as ()=>void;
  await controller.setFacingMode("environment");
  ended();
  expect(controller.isRunning()).toBe(true);expect(disconnect).not.toHaveBeenCalled();
  controller.stop();
 });
 it("releases permission results arriving after stop",async()=>{
  let release!:(stream:MediaStream)=>void;
  vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(new Promise(resolve=>{release=resolve;}));
  const controller=createCameraController({video,onFrame:vi.fn()});
  const starting=controller.start();controller.stop();release(stream);
  await expect(starting).rejects.toThrow("cancelled");
  expect(track.stop).toHaveBeenCalledOnce();expect(controller.isRunning()).toBe(false);expect(video.srcObject).toBeNull();
 });
 it("does not retry camera permission denial",async()=>{
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new DOMException("Denied","NotAllowedError"));
  const controller=createCameraController({video,onFrame:vi.fn()});
  await expect(controller.start()).rejects.toThrow("permission was blocked");
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledOnce();
 });
 it("keeps a pending permission request valid when preview visibility changes",async()=>{
  let release!:(stream:MediaStream)=>void;
  vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(new Promise(resolve=>{release=resolve;}));
  const controller=createCameraController({video,onFrame:vi.fn()});
  const starting=controller.start();controller.setPreviewVisible(false);release(stream);
  await expect(starting).resolves.toBeDefined();expect(controller.isRunning()).toBe(true);
  expect(window.requestAnimationFrame).toHaveBeenCalledOnce();controller.stop();
 });
 it("does not let visibility changes cancel a replacement camera start",async()=>{
  const controller=createCameraController({video,onFrame:vi.fn()});await controller.start();
  const visibility=vi.mocked(document.addEventListener).mock.calls.find(call=>call[0]==="visibilitychange")?.[1] as ()=>void;
  let release!:(stream:MediaStream)=>void;
  vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(new Promise(resolve=>{release=resolve;}));
  const starting=controller.setFacingMode("environment");visibility();release(stream);
  await expect(starting).resolves.toBeDefined();expect(controller.isRunning()).toBe(true);controller.stop();
 });
 it("requires the rear camera and never falls back to an arbitrary front camera",async()=>{
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new DOMException("No rear camera","OverconstrainedError"));
  const controller=createCameraController({video,onFrame:vi.fn()});
  await expect(controller.setFacingMode("environment")).rejects.toThrow();
  const calls=vi.mocked(navigator.mediaDevices.getUserMedia).mock.calls;
  expect(calls).toHaveLength(3);
  for(const [constraints] of calls) expect(constraints?.video).toMatchObject({facingMode:{exact:"environment"}});
 });
 it("explains when a rear camera cannot be opened",async()=>{
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new DOMException("Unsupported facing mode","OverconstrainedError"));
  const controller=createCameraController({video,onFrame:vi.fn()});
  await expect(controller.setFacingMode("environment")).rejects.toThrow("rear camera");
 });
 it("ignores late permission success from a superseded start",async()=>{
  let release!:(stream:MediaStream)=>void;
  const replacementTrack={...track,stop:vi.fn()};
  const replacement={getTracks:()=>[replacementTrack],getVideoTracks:()=>[replacementTrack]} as unknown as MediaStream;
  vi.mocked(navigator.mediaDevices.getUserMedia)
   .mockReturnValueOnce(new Promise(resolve=>{release=resolve;})).mockResolvedValueOnce(replacement);
  const controller=createCameraController({video,onFrame:vi.fn()});
  const original=controller.start();await controller.start("desktop_low");release(stream);
  await expect(original).rejects.toThrow("cancelled");
  expect(track.stop).toHaveBeenCalledOnce();expect(replacementTrack.stop).not.toHaveBeenCalled();
  expect(video.srcObject).toBe(replacement);expect(controller.getProfile().preset).toBe("desktop_low");
  expect(controller.isRunning()).toBe(true);controller.stop();
 });
 it("invalidates queued frames and reschedules after orientation changes",async()=>{
  const analyze=vi.fn();const reset=vi.fn();
  const controller=createCameraController({video,onFrame:analyze,onReset:reset});await controller.start();
  const queued=callback;
  const orient=vi.mocked(window.addEventListener).mock.calls.find(call=>call[0]==="orientationchange")?.[1] as ()=>void;
  orient();await queued(0,{});expect(analyze).not.toHaveBeenCalled();
  expect(reset).toHaveBeenCalledOnce();expect(video.cancelVideoFrameCallback).toHaveBeenCalledOnce();
  await callback(0,{});expect(analyze).toHaveBeenCalledOnce();controller.stop();
 });
 it("pauses hidden-tab capture and resumes with one frame loop",async()=>{
  const analyze=vi.fn();const controller=createCameraController({video,onFrame:analyze});await controller.start();
  const queued=callback;
  const visibility=vi.mocked(document.addEventListener).mock.calls.find(call=>call[0]==="visibilitychange")?.[1] as ()=>void;
  Object.defineProperty(document,"hidden",{value:true,writable:true});visibility();await queued(0,{});
  expect(analyze).not.toHaveBeenCalled();expect(video.requestVideoFrameCallback).toHaveBeenCalledOnce();
  Object.defineProperty(document,"hidden",{value:false,writable:true});visibility();
  expect(video.requestVideoFrameCallback).toHaveBeenCalledTimes(2);
  await callback(0,{});expect(analyze).toHaveBeenCalledOnce();expect(track.stop).not.toHaveBeenCalled();controller.stop();
 });
 it("disconnects the current stream after visibility and orientation resets",async()=>{
  const disconnect=vi.fn();const controller=createCameraController({video,onFrame:vi.fn(),onDisconnect:disconnect});await controller.start();
  const visibility=vi.mocked(document.addEventListener).mock.calls.find(call=>call[0]==="visibilitychange")?.[1] as ()=>void;
  const orient=vi.mocked(window.addEventListener).mock.calls.find(call=>call[0]==="orientationchange")?.[1] as ()=>void;
  visibility();orient();
  const ended=track.addEventListener.mock.calls.find(call=>call[0]==="ended")?.[1] as unknown as ()=>void;
  ended();ended();expect(disconnect).toHaveBeenCalledOnce();expect(controller.isRunning()).toBe(false);
  expect(track.stop).toHaveBeenCalledOnce();expect(video.srcObject).toBeNull();controller.stop();
 });
 it("rejects a front camera returned for a rear-camera request",async()=>{
  const frontTrack={...track,getSettings:()=>({facingMode:"user"})};
  const frontStream={getTracks:()=>[frontTrack],getVideoTracks:()=>[frontTrack]} as unknown as MediaStream;
  vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(frontStream);
  const controller=createCameraController({video,onFrame:vi.fn()});
  await expect(controller.setFacingMode("environment")).rejects.toThrow("rear camera");
  expect(frontTrack.stop).toHaveBeenCalledOnce();expect(controller.isRunning()).toBe(false);
  expect(video.srcObject).toBeNull();
 });
 it("reports an unmirrored rear-camera profile",async()=>{
  const controller=createCameraController({video,onFrame:vi.fn()});
  const result=await controller.setFacingMode("environment");
  expect(result.profile).toMatchObject({facingMode:"environment",mirroredPreview:false});
  expect(controller.getProfile()).toMatchObject({facingMode:"environment",mirroredPreview:false});controller.stop();
 });
 it("restores the front-camera request after a failed rear-camera switch",async()=>{
  const acquire=vi.mocked(navigator.mediaDevices.getUserMedia);
  const controller=createCameraController({video,onFrame:vi.fn()});await controller.start();
  acquire.mockRejectedValue(new DOMException("No rear camera","NotFoundError"));
  await expect(controller.setFacingMode("environment")).rejects.toThrow("rear camera");
  acquire.mockResolvedValue(stream);await controller.start();
  expect(acquire.mock.calls.at(-1)?.[0]?.video).toMatchObject({facingMode:{ideal:"user"}});
  expect(controller.getProfile()).toMatchObject({facingMode:"user",mirroredPreview:true});
  expect(controller.isRunning()).toBe(true);controller.stop();
 });
 it("does not roll an older failed camera switch back over a newer switch",async()=>{
  const acquire=vi.mocked(navigator.mediaDevices.getUserMedia);
  const controller=createCameraController({video,onFrame:vi.fn()});await controller.start();
  let rejectOld!:(error:Error)=>void;
  acquire.mockReturnValueOnce(new Promise((_,reject)=>{rejectOld=reject;}));
  const original=controller.setFacingMode("environment");
  await controller.setFacingMode("environment");rejectOld(new DOMException("No rear camera","NotFoundError"));
  await expect(original).rejects.toThrow("cancelled");
  expect(controller.getProfile()).toMatchObject({facingMode:"environment",mirroredPreview:false});
  expect(controller.isRunning()).toBe(true);controller.stop();
 });
 it("restores the front request when a pending rear switch is cancelled by stop",async()=>{
  const acquire=vi.mocked(navigator.mediaDevices.getUserMedia);
  const controller=createCameraController({video,onFrame:vi.fn()});await controller.start();
  let release!:(value:MediaStream)=>void;
  acquire.mockReturnValueOnce(new Promise(resolve=>{release=resolve;}));
  const switching=controller.setFacingMode("environment");controller.stop();release(stream);
  await expect(switching).rejects.toThrow("cancelled");
  await controller.start();
  expect(acquire.mock.calls.at(-1)?.[0]?.video).toMatchObject({facingMode:{ideal:"user"}});
  controller.stop();
 });
 it("releases the stream when video playback fails",async()=>{
  vi.mocked(video.play).mockRejectedValue(new Error("Playback failed"));
  const controller=createCameraController({video,onFrame:vi.fn()});
  await expect(controller.start()).rejects.toThrow("Playback failed");
  expect(track.stop).toHaveBeenCalledOnce();expect(video.srcObject).toBeNull();
  expect(controller.isRunning()).toBe(false);expect(video.requestVideoFrameCallback).not.toHaveBeenCalled();
 });
 it("does not let an older playback failure stop a replacement camera",async()=>{
  let rejectPlay!:(error:Error)=>void;
  vi.mocked(video.play).mockReturnValueOnce(new Promise((_,reject)=>{rejectPlay=reject;}));
  const replacementTrack={...track,stop:vi.fn()};
  const replacement={getTracks:()=>[replacementTrack],getVideoTracks:()=>[replacementTrack]} as unknown as MediaStream;
  vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(stream).mockResolvedValueOnce(replacement);
  const controller=createCameraController({video,onFrame:vi.fn()});
  const original=controller.start();await Promise.resolve();await controller.start();rejectPlay(new Error("Old playback failed"));
  await expect(original).rejects.toThrow();expect(controller.isRunning()).toBe(true);
  expect(video.srcObject).toBe(replacement);expect(replacementTrack.stop).not.toHaveBeenCalled();controller.stop();
 });
 it("waits for analysis before scheduling another frame",async()=>{
  let finish!:()=>void;const analyze=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve;}));
  const controller=createCameraController({video,onFrame:analyze});await controller.start();
  const frame=callback(0,{});expect(analyze).toHaveBeenCalledOnce();expect(video.requestVideoFrameCallback).toHaveBeenCalledTimes(1);
  finish();await frame;expect(video.requestVideoFrameCallback).toHaveBeenCalledTimes(2);controller.stop();
 });
 it("does not score a queued callback after stop",async()=>{
  const analyze=vi.fn();const controller=createCameraController({video,onFrame:analyze});await controller.start();
  const queued=callback;controller.stop();await queued(0,{});expect(analyze).not.toHaveBeenCalled();
 });
 it("keeps a minimized stream alive and scores only new decoded frames",async()=>{
  const analyze=vi.fn();const reset=vi.fn();const controller=createCameraController({video,onFrame:analyze,onReset:reset});
  await controller.start();controller.setPreviewVisible(false);
  expect(video.cancelVideoFrameCallback).toHaveBeenCalled();
  await animationCallback(100);expect(analyze).not.toHaveBeenCalled();
  video.currentTime=0.1;await animationCallback(200);expect(analyze).toHaveBeenCalledOnce();
  await animationCallback(300);expect(analyze).toHaveBeenCalledOnce();
  await animationCallback(1300);expect(reset).toHaveBeenCalledOnce();
  await animationCallback(1400);expect(reset).toHaveBeenCalledOnce();
  video.currentTime=0.2;await animationCallback(1500);expect(analyze).toHaveBeenCalledTimes(2);
  controller.setPreviewVisible(true);expect(video.requestVideoFrameCallback).toHaveBeenCalledTimes(2);
  expect(track.stop).not.toHaveBeenCalled();controller.stop();expect(track.stop).toHaveBeenCalledOnce();
 });
 it("does not overlap analysis when preview mode changes during inference",async()=>{
  let finish!:()=>void;const analyze=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve;}));
  const controller=createCameraController({video,onFrame:analyze});await controller.start();
  const original=callback(0,{});controller.setPreviewVisible(false);video.currentTime=0.1;
  await animationCallback(200);expect(analyze).toHaveBeenCalledOnce();
  finish();await original;controller.stop();
 });

});
