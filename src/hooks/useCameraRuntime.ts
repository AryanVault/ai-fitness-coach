"use client";
import { useEffect, useRef, type RefObject } from "react";
import { createCameraController } from "@/lib/camera/controller";
import { createPoseTrackingEngine } from "@/lib/pose/tracking-engine";
import type { TrackingMode } from "@/lib/pose/providers";
import type { TrackingFrame, SessionTelemetryEvent } from "@/lib/pose/types";
export function useCameraRuntime(options: { videoRef: RefObject<HTMLVideoElement | null>; exerciseId: () => import("@/lib/pose/types").ExerciseId; onFrame: (frame: TrackingFrame | null, fps: number) => void; onDisconnect: () => void; onBeforeLeave?: () => void; onReset: () => void; onError: (error: Error) => void; onTelemetry: (event: SessionTelemetryEvent) => void; onProfile: (label: string) => void }) {
  const callbacks = useRef(options); callbacks.current = options;
  const controllerRef = useRef<ReturnType<typeof createCameraController> | null>(null);
  const engineRef = useRef<ReturnType<typeof createPoseTrackingEngine> | null>(null);
  const frameGenerationRef = useRef(0);
  const trackingModeRef = useRef<TrackingMode>("auto");
  const previewRequestedRef = useRef(true);
  const previewIntersectingRef = useRef(true);
  const stop = () => { frameGenerationRef.current++; controllerRef.current?.stop(); void engineRef.current?.stop(); };
  useEffect(() => {
    const video=callbacks.current.videoRef.current;
    const observer=video && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(entries=>{
      previewIntersectingRef.current=entries[0]?.isIntersecting ?? true;
      controllerRef.current?.setPreviewVisible(previewRequestedRef.current && previewIntersectingRef.current);
    }) : null;
    if(video)observer?.observe(video);
    const leave = () => {
      if (!controllerRef.current) return;
      callbacks.current.onBeforeLeave?.();
      stop();
      callbacks.current.onDisconnect();
    };
    const navigate = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.pathname !== window.location.pathname || target.origin !== window.location.origin) leave();
    };
    // Release capture before a client transition competes with frame-driven renders.
    document.addEventListener("click", navigate, true);
    window.addEventListener("pagehide", leave);
    window.addEventListener("popstate", leave);
    window.addEventListener("fitcoach:stop-camera", leave);
    return () => {
      observer?.disconnect();
      document.removeEventListener("click", navigate, true);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("popstate", leave);
      window.removeEventListener("fitcoach:stop-camera", leave);
      stop();
    };
  }, []);
  return {
    controllerRef, engineRef, stop,
    setPreviewVisible(visible:boolean) {
      previewRequestedRef.current=visible;
      controllerRef.current?.setPreviewVisible(visible && previewIntersectingRef.current);
    },
    async setMode(mode: TrackingMode) {
      trackingModeRef.current=mode;frameGenerationRef.current++;
      await engineRef.current?.setMode(mode);
      callbacks.current.onReset();
    },
    async start() {
      const video = callbacks.current.videoRef.current;
      if (!video) throw new Error("Camera preview unavailable");
      const preset = /Android/i.test(navigator.userAgent) ? "desktop_balanced" : "desktop_hq";
      controllerRef.current ??= createCameraController({ video, preset,
        onFrame: async frame => {
          const generation = frameGenerationRef.current;
          try {
            const tracked = await engineRef.current!.processFrame(frame, callbacks.current.exerciseId());
            if (generation === frameGenerationRef.current && controllerRef.current?.isRunning()) callbacks.current.onFrame(tracked, frame.fps);
          } catch (error) {
            if (generation === frameGenerationRef.current && controllerRef.current?.isRunning()) { stop(); callbacks.current.onError(error instanceof Error ? error : new Error("Pose analysis unavailable")); }
          }
        },
        onDisconnect: () => { stop(); callbacks.current.onDisconnect(); },
        onReset: () => { frameGenerationRef.current++; engineRef.current?.reset(); callbacks.current.onReset(); },
      });
      engineRef.current ??= createPoseTrackingEngine({ onTelemetry: event => callbacks.current.onTelemetry(event), onPerformance: latency => { void controllerRef.current?.adaptLatency(latency).then(() => callbacks.current.onProfile(controllerRef.current!.getProfile().label)); } });
      await engineRef.current.setMode(trackingModeRef.current);
      controllerRef.current.setPreviewVisible(previewRequestedRef.current && previewIntersectingRef.current);
      return controllerRef.current.start(preset);
    },
  };
}
