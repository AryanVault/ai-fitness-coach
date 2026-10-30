import type { CameraPreset, CameraProfile } from "@/lib/pose/types";

type CameraFrame = {
  video: HTMLVideoElement;
  timestampMs: number;
  frameIndex: number;
  fps: number;
  captureFps?: number;
  width: number;
  height: number;
};

type CameraControllerOptions = {
  video: HTMLVideoElement;
  preset?: CameraPreset;
  onFrame: (frame: CameraFrame) => void | Promise<void>;
  onDisconnect?: () => void;
  onReset?: () => void;
};

const CAMERA_PROFILES: Record<CameraPreset, CameraProfile> = {
  desktop_hq: {
    preset: "desktop_hq",
    label: "High detail (720p)",
    width: 1280,
    height: 720,
    frameRate: 30,
    mirroredPreview: true,
    facingMode: "user",
  },
  desktop_balanced: {
    preset: "desktop_balanced",
    label: "Balanced (540p)",
    width: 960,
    height: 540,
    frameRate: 24,
    mirroredPreview: true,
    facingMode: "user",
  },
  desktop_low: {
    preset: "desktop_low",
    label: "Light (360p)",
    width: 640,
    height: 360,
    frameRate: 20,
    mirroredPreview: true,
    facingMode: "user",
  },
};

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export function getCameraProfile(preset: CameraPreset) {
  return CAMERA_PROFILES[preset];
}

export function createCameraController(options: CameraControllerOptions) {
  const video = options.video as VideoWithFrameCallback;
  let stream: MediaStream | null = null;
  let running = false;
  let frameHandle: number | null = null;
  let animationHandle: number | null = null;
  let frameIndex = 0;
  let epoch = 0;
  let startGeneration = 0;
  let requestGeneration = 0;
  let slowFrames = 0;
  let facingMode: "user" | "environment" = "user";
  let lastTimestampMs = 0;
  let lastMediaTime = -1;
  let framePending = false;
  let previewVisible = true;
  let stallReported = false;
  let profile = CAMERA_PROFILES[options.preset ?? "desktop_hq"];

  const emitFrame = async (timestampMs: number) => {
    if (framePending) return;
    framePending = true;
    try {
      lastMediaTime = video.currentTime;
      stallReported = false;
      const delta = lastTimestampMs > 0 ? Math.max(timestampMs - lastTimestampMs, 1) : 1000 / profile.frameRate;
      lastTimestampMs = timestampMs;
      frameIndex += 1;
      await options.onFrame({
        video,
        timestampMs,
        frameIndex,
        fps: Math.round(1000 / delta),
        captureFps: stream?.getVideoTracks()[0]?.getSettings?.().frameRate,
        width: video.videoWidth || profile.width,
        height: video.videoHeight || profile.height,
      });
    } finally {
      framePending = false;
    }
  };

  const scheduleFrame = () => {
    if (!running || document.hidden) return;

    if (previewVisible && typeof video.requestVideoFrameCallback === "function") {
      const scheduledEpoch = epoch;
      frameHandle = video.requestVideoFrameCallback(async () => {
        if (!running || scheduledEpoch !== epoch) return;
        await emitFrame(performance.now());
        if (scheduledEpoch === epoch) scheduleFrame();
      });
      return;
    }

    const scheduledEpoch = epoch;
    animationHandle = window.requestAnimationFrame(async now => {
      if (!running || scheduledEpoch !== epoch) return;
      if (video.currentTime !== lastMediaTime && (!lastTimestampMs || now - lastTimestampMs >= 1000 / profile.frameRate)) {
        await emitFrame(now);
      } else if (lastTimestampMs && now - lastTimestampMs > 1000 && !stallReported) {
        stallReported = true;
        lastTimestampMs = 0;
        options.onReset?.();
      }
      if (scheduledEpoch === epoch) scheduleFrame();
    });
  };

  const stopScheduling = () => {
    if (frameHandle !== null && typeof video.cancelVideoFrameCallback === "function") {
      video.cancelVideoFrameCallback(frameHandle);
      frameHandle = null;
    }
    if (animationHandle !== null) {
      window.cancelAnimationFrame(animationHandle);
      animationHandle = null;
    }
  };

  const stopTracks = () => {
    const retired = stream;
    stream = null;
    video.srcObject = null;
    retired?.getTracks().forEach((track) => track.stop());
  };

  const buildConstraints = (requestedProfile: CameraProfile, requestedFacing: "user" | "environment") => ({
    audio: false,
    video: {
      facingMode: requestedFacing === "environment" ? { exact: requestedFacing } : { ideal: requestedFacing },
      width: { ideal: requestedProfile.width },
      height: { ideal: requestedProfile.height },
      frameRate: { ideal: requestedProfile.frameRate, max: requestedProfile.frameRate },
    },
  });

  const normalizeCameraError = (error: unknown, requestedFacing: "user" | "environment") => {
    const err = error as { name?: string; message?: string };
    switch (err?.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return new Error("Camera permission was blocked. Allow camera access in your browser and system settings, then try again.");
      case "NotFoundError":
      case "DevicesNotFoundError":
        return new Error(requestedFacing === "environment" ? "No rear camera was found on this device. Choose the front camera." : "No camera was found on this device.");
      case "NotReadableError":
      case "TrackStartError":
        return new Error("Your camera is busy in another app. Close Zoom, Meet, Photo Booth, or other camera apps and try again.");
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return new Error(requestedFacing === "environment" ? "The rear camera could not be opened at a supported quality. Choose the front camera or use a device with a rear camera." : "This camera does not support the requested quality settings.");
      case "SecurityError":
        return new Error("Camera access is blocked by browser security settings. Open the app over HTTPS or localhost and allow camera permissions.");
      default:
        return new Error(err?.message || "Failed to access camera.");
    }
  };

  const handleVisibility = () => {
    epoch++; stopScheduling(); lastTimestampMs = 0; options.onReset?.();
    if (!document.hidden) scheduleFrame();
  };
  const handleOrientation = () => {
    epoch++; stopScheduling(); lastTimestampMs = 0; lastMediaTime = -1; options.onReset?.(); scheduleFrame();
  };
  const effectiveProfile = (): CameraProfile => ({ ...profile, facingMode, mirroredPreview: facingMode === "user" });
  return {
    async start(nextPreset?: CameraPreset) {
      if (nextPreset) {
        profile = CAMERA_PROFILES[nextPreset];
      }

      const startEpoch = ++startGeneration;
      requestGeneration++;
      const requestedFacing = facingMode;
      epoch++;
      running = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("orientationchange", handleOrientation);
      stopScheduling();
      stopTracks();
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support camera access. Use Chrome or Edge over HTTPS or localhost.");
      }

      const presetsToTry: CameraPreset[] = nextPreset
        ? [nextPreset, "desktop_balanced", "desktop_low"]
        : [profile.preset, "desktop_balanced", "desktop_low"];

      let lastError: unknown = null;
      let acquired: MediaStream | null = null;
      let acquiredProfile = profile;
      for (const presetName of Array.from(new Set(presetsToTry))) {
        acquiredProfile = CAMERA_PROFILES[presetName];
        try {
          acquired = await navigator.mediaDevices.getUserMedia(buildConstraints(acquiredProfile, requestedFacing));
          break;
        } catch (error) {
          lastError = error;
          if (startEpoch !== startGeneration) throw new Error("Camera start cancelled");
          const name = (error as { name?: string })?.name;
          if (name !== "OverconstrainedError" && name !== "ConstraintNotSatisfiedError") {
            throw normalizeCameraError(error, requestedFacing);
          }
        }
      }

      if (!acquired && requestedFacing === "user") {
        try {
          acquired = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        } catch (error) {
          lastError = error;
        }
      }

      if (startEpoch !== startGeneration) {
        acquired?.getTracks().forEach(track => track.stop());
        throw new Error("Camera start cancelled");
      }
      if (!acquired) throw normalizeCameraError(lastError, requestedFacing);
      const track = acquired.getVideoTracks()[0];
      const actualFacing = track?.getSettings?.().facingMode;
      if (requestedFacing === "environment" && actualFacing && actualFacing !== "environment") {
        acquired.getTracks().forEach(track => track.stop());
        throw new Error("This device did not provide a rear camera. Choose the front camera or use a device with a rear camera.");
      }
      profile = acquiredProfile;
      stream = acquired;

      track?.addEventListener("ended", () => {
        if (startEpoch !== startGeneration || stream !== acquired) return;
        startGeneration++;
        epoch++;
        running = false;
        stopScheduling();
        stopTracks();
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("orientationchange", handleOrientation);
        options.onDisconnect?.();
      });

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      try { await video.play(); } catch (error) {
        if (startEpoch !== startGeneration) throw new Error("Camera start cancelled");
        stopTracks();
        throw normalizeCameraError(error, requestedFacing);
      }
      if (startEpoch !== startGeneration) {
        throw new Error("Camera start cancelled");
      }
      // A preferred front request may legally resolve to a rear camera. Trust
      // reported facing only after this acquisition and playback are still current.
      if(actualFacing === "user" || actualFacing === "environment") facingMode=actualFacing;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("orientationchange", handleOrientation);
      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("orientationchange", handleOrientation);

      running = true;
      frameIndex = 0;
      lastTimestampMs = 0;
      lastMediaTime = -1;
      stallReported = false;
      scheduleFrame();

      return {
        profile: effectiveProfile(),
        settings: track?.getSettings?.() ?? {},
      };
    },
    setPreviewVisible(visible: boolean) {
      if (previewVisible === visible) return;
      previewVisible = visible;
      epoch++;
      stopScheduling();
      lastTimestampMs = 0;
      lastMediaTime = video.currentTime;
      scheduleFrame();
    },
    async setFacingMode(next: "user" | "environment") {
      const previousFacing = facingMode;
      facingMode = next; options.onReset?.();
      const starting = this.start(profile.preset);
      const switchGeneration = requestGeneration;
      try {
        return await starting;
      } catch (error) {
        if (switchGeneration === requestGeneration) facingMode = previousFacing;
        throw error;
      }
    },
    async adaptLatency(latencyMs: number) {
      slowFrames = latencyMs > 65 ? slowFrames + 1 : 0;
      if (slowFrames < 30 || profile.preset === "desktop_low") return;
      slowFrames = 0;
      profile = CAMERA_PROFILES[profile.preset === "desktop_hq" ? "desktop_balanced" : "desktop_low"];
      try { await stream?.getVideoTracks()[0]?.applyConstraints({ width: { ideal: profile.width }, height: { ideal: profile.height }, frameRate: { ideal: profile.frameRate, max: profile.frameRate } }); } catch { /* Keep the usable camera stream; worker also downgrades its model. */ }
    },
    async setPreset(nextPreset: CameraPreset) {
      if (profile.preset === nextPreset && running) {
        return effectiveProfile();
      }
      profile = CAMERA_PROFILES[nextPreset];
      if (running) {
        await this.start(nextPreset);
      }
      return effectiveProfile();
    },
    stop() {
      startGeneration++;
      epoch++;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("orientationchange", handleOrientation);
      running = false;
      stopScheduling();
      stopTracks();
    },
    isRunning() {
      return running;
    },
    getProfile() {
      return effectiveProfile();
    },
  };
}
