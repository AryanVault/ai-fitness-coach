import { buildTrackingFrame, estimateMotion } from "@/lib/pose/confidence";
import { createLandmarkFilter } from "@/lib/pose/landmark-filter";
import { createObservationGuard } from "@/lib/pose/observation-guard";
import { modelForMode, type TrackingMode, type ModelQuality, type PoseProvider } from "./providers";
import type { ExerciseId, Landmark, SessionTelemetryEvent, TrackingFrame } from "@/lib/pose/types";
import type { PoseWorkerReply, PoseWorkerRequest } from "@/lib/pose/tracking.worker";
type CameraFrame = { video: HTMLVideoElement; timestampMs: number; frameIndex: number; fps: number; captureFps?: number; width?: number; height?: number };
export function createPoseTrackingEngine(options: { onTelemetry?: (event: SessionTelemetryEvent) => void; onPerformance?: (latencyMs: number) => void }) {
  let worker: Worker | null = null;
  let initialized: Promise<void> | null = null;
  let pending: { id: number; resolve: (reply: PoseWorkerReply) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null = null;
  let id = 0;
  let generation = 0;
  let processing = false;
  let previousSmoothed: Landmark[] | null = null;
  let previousRaw: Landmark[] | null = null;
  let previousTimestamp = 0;
  let mode: TrackingMode = "auto";
  let quality: ModelQuality = "full";
  let provider: PoseProvider = "mediapipe";
  let slowFrames = 0;
  let warmingUp = true;
  const filter = createLandmarkFilter();
  const displayFilter = createLandmarkFilter({ minCutoff: 6, beta: 1 });
  const observations = createObservationGuard();
  let previousExercise: ExerciseId | null = null;
  function request(message: Omit<PoseWorkerRequest, "id">, transfer: Transferable[] = []): Promise<PoseWorkerReply> {
    if (!worker || pending) return Promise.reject(new Error("Pose worker unavailable"));
    const requestId = ++id;
    return new Promise((resolve, reject) => {
      // The first detect call compiles WASM/XNNPACK kernels. Its cold cost is
      // model startup, not the steady-state frame latency budget.
      if (message.type === "init") warmingUp = true;
      const timer = setTimeout(() => { pending = null; worker?.terminate(); worker = null; initialized = null; reject(new Error("Pose model timed out. Restart the camera to retry.")); }, message.type === "init" || warmingUp ? 30000 : 5000);
      pending = { id: requestId, resolve, reject, timer };
      try { worker!.postMessage({ ...message, id: requestId }, transfer); }
      catch { clearTimeout(timer); pending = null; reject(new Error("Unable to send camera frame")); }
    });
  }
  function createWorker() {
    // Classic worker lets the MediaPipe WASM loader use importScripts.
    const created = new Worker(new URL(provider === "movenet" ? "/movenet/movenet-worker.js" : "/mediapipe/pose-worker.js", window.location.origin));
    warmingUp = true;
    worker = created;
    created.onmessage = ({ data }: MessageEvent<PoseWorkerReply>) => {
      if (worker !== created || !pending || pending.id !== data.id) return;
      const current = pending; pending = null; clearTimeout(current.timer);
      if (data.error) current.reject(new Error(data.error)); else { if (Array.isArray(data.landmarks)) warmingUp = false; current.resolve(data); }
    };
    created.onerror = () => { if (worker !== created) return; if (pending) { clearTimeout(pending.timer); pending.reject(new Error("Pose worker failed. Restart the camera to retry.")); pending = null; } worker?.terminate(); worker = null; initialized = null; };
  }
  const init = () => {
    if (!initialized) {
      const token = generation;
      initialized = (async () => {
        const requested = {provider,quality};
        const candidates: Array<{provider:PoseProvider;quality:ModelQuality}> = [requested];
        if (provider === "movenet" || quality === "heavy") candidates.push({provider:"mediapipe",quality:"full"});
        if (quality !== "lite") candidates.push({provider:"mediapipe",quality:"lite"});
        let failure: unknown;
        for (const candidate of candidates) {
          if (token !== generation) throw new Error("Pose analysis stopped");
          const changed = candidate.provider !== provider;
          if (changed) { worker?.terminate(); worker=null; }
          provider=candidate.provider;quality=candidate.quality;
          if (!worker) createWorker();
          try {
            await request({ type: "init", quality, origin: window.location.origin });
            if (token !== generation) throw new Error("Pose analysis stopped");
            if (candidate !== requested) options.onTelemetry?.({timestampMs:0,type:"model_quality_downgrade",message:`Requested model unavailable. Using ${provider} ${quality}.`,meta:{from:requested.quality,to:quality,provider}});
            return;
          } catch(error) { failure=error; }
        }
        throw failure;
      })().catch(error=>{initialized=null;throw error;});
    }
    return initialized;
  };
  const resetFilters = () => { filter.reset(); displayFilter.reset(); observations.reset(); previousRaw = null; previousSmoothed = null; };
  const reset = () => { generation++; resetFilters(); previousExercise = null; previousTimestamp = 0; slowFrames = 0; };
  return {
    init,
    async setMode(next: TrackingMode) {
      if (mode === next) return;
      await this.stop(); mode=next;
      const model=modelForMode(mode); provider=model.provider; quality=model.quality;
    },
    async processFrame(frame: CameraFrame, exerciseId: ExerciseId): Promise<TrackingFrame | null> {
      if (processing) return null;
      processing = true;
      const token = generation;
      let bitmap: ImageBitmap | null = null;
      try {
        await init();
        if (token !== generation) return null;
        bitmap = await createImageBitmap(frame.video);
        if (token !== generation) return null;
        const imageAspectRatio = (bitmap.width || frame.video.videoWidth || frame.width || 1) / (bitmap.height || frame.video.videoHeight || frame.height || 1);
        const reply = await request({ type: "frame", bitmap, timestampMs: frame.timestampMs }, [bitmap]);
        bitmap = null;
        if (token !== generation) return null;
        options.onPerformance?.(reply.latencyMs ?? 0);
        const raw = reply.landmarks ?? [];
        if (raw.length !== 33 || raw.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.y)||(point.z!==undefined&&!Number.isFinite(point.z)))) { reset(); return null; }
        if (exerciseId !== previousExercise || (previousTimestamp && (frame.timestampMs <= previousTimestamp || frame.timestampMs - previousTimestamp > 500))) resetFilters();
        previousExercise = exerciseId;
        const observation = observations.update(raw, frame.timestampMs, imageAspectRatio);
        const geometry = {aspectRatio:imageAspectRatio, bodyScale:observation.bodyScale};
        const tracked = buildTrackingFrame({ exerciseId, rawLandmarks: raw, observedLandmarks: observation.landmarks, filteredLandmarks: filter.update(observation.landmarks, frame.timestampMs, geometry), worldLandmarks: reply.worldLandmarks ?? [], imageAspectRatio, previousSmoothed, timestampMs: frame.timestampMs, frameIndex: frame.frameIndex, fps: frame.fps, brightness: reply.brightness ?? 80, motion: estimateMotion(previousRaw, raw) });
        tracked.displayLandmarks = displayFilter.update(observation.landmarks, frame.timestampMs, geometry);
        tracked.rejectedJoints = observation.rejected;
        tracked.captureFps = frame.captureFps;
        tracked.inferenceLatencyMs = reply.latencyMs;
        tracked.frameAgeMs = Math.max(0, performance.now() - frame.timestampMs);
        tracked.delegate = reply.delegate;
        tracked.modelQuality = quality;
        tracked.provider = provider;
        tracked.poseCount = reply.poseCount;
        if ((tracked.poseCount ?? 0) > 1) {
          resetFilters();
          tracked.frameQuality = "occluded";
          tracked.frameQualityMessage = "More than one person detected. Keep only the person training in frame.";
          tracked.reliability = Object.fromEntries(Object.keys(tracked.reliability).map(key => [key, false]));
        }
        previousRaw = raw; previousSmoothed = tracked.smoothedLandmarks; previousTimestamp = frame.timestampMs;
        slowFrames = (reply.latencyMs ?? 0) > 65 ? slowFrames + 1 : 0;
        if (slowFrames >= 30 && provider === "mediapipe" && quality !== "lite") {
          const previousQuality = quality;
          quality = quality === "heavy" ? "full" : "lite"; slowFrames = 0;
          await request({ type: "init", quality, origin: window.location.origin });
          resetFilters(); previousTimestamp=0;
          options.onTelemetry?.({ timestampMs: frame.timestampMs, type: "model_quality_downgrade", message: `Using MediaPipe ${quality} to improve responsiveness.`, meta: { from: previousQuality, to: quality } });
          return null;
        }
        return tracked;
      } catch(error) {
        if(token === generation && (provider === "movenet" || quality === "heavy")){
          const failedModel=quality;
          worker?.terminate();worker=null;initialized=null;provider="mediapipe";quality="full";
          resetFilters();previousTimestamp=0;
          options.onTelemetry?.({timestampMs:frame.timestampMs,type:"model_quality_downgrade",message:"Selected model could not continue. Returning to balanced tracking.",meta:{from:failedModel,to:"full"}});
          return null;
        }
        throw error;
      } finally { bitmap?.close(); processing = false; }
    },
    reset,
    async stop() {
      reset();
      if (pending) { clearTimeout(pending.timer); pending.reject(new Error("Pose analysis stopped")); pending = null; }
      worker?.terminate(); worker = null; initialized = null;
      const selected = modelForMode(mode); quality=selected.quality;provider=selected.provider;
    },
  };
}
