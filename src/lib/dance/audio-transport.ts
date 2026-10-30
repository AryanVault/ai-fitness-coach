export type RoutineAudioState = "idle" | "starting" | "playing" | "unavailable";

export function createRoutineAudioTransport(options: {
  createAudio?: (url: string) => HTMLAudioElement;
  onState?: (state: RoutineAudioState) => void;
} = {}) {
  let audio: HTMLAudioElement | null = null;
  let state: RoutineAudioState = "idle";
  let generation = 0;
  let loops = 0;
  let lastPosition = 0;
  let playbackStartedAt = 0;
  let lastAdvancedAt = 0;
  // Browsers may round currentTime to 100 ms. Allow more than two such ticks,
  // but never keep scoring indefinitely from a frozen media clock.
  const clockStallMs = 250;
  const setState = (next: RoutineAudioState) => { state = next; options.onState?.(next); };
  const stop = () => {
    generation++;
    if (audio) { audio.onerror = null; audio.onpause = null; audio.pause(); audio.removeAttribute("src"); audio.load(); }
    audio = null; loops = 0; lastPosition = 0; playbackStartedAt = 0; lastAdvancedAt = 0; setState("idle");
  };
  return {
    stop,
    get state() { return state; },
    async start(url: string): Promise<boolean> {
      stop(); const token = generation;
      setState("starting");
      let created: HTMLAudioElement;
      try { created = (options.createAudio ?? (src => new Audio(src)))(url); }
      catch { setState("unavailable"); return false; }
      audio = created; created.loop = true; created.preload = "auto"; created.volume = .5;
      created.onerror = () => { if (audio === created) setState("unavailable"); };
      created.onpause = () => { if (audio === created && state === "playing") setState("unavailable"); };
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        // Called synchronously inside the start-session gesture, before await.
        await Promise.race([created.play(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Audio startup timed out")), 6000); })]);
        if (token !== generation) { created.pause(); return false; }
        if (created.paused || created.error) throw new Error("Audio unavailable");
        playbackStartedAt = performance.now(); lastAdvancedAt = playbackStartedAt;
        lastPosition = created.currentTime * 1000;
        setState("playing"); return true;
      } catch {
        if (token === generation) { created.pause(); setState("unavailable"); }
        return false;
      } finally { if (timer) clearTimeout(timer); }
    },
    positionMs(capturedAtMs?: number): number | null {
      if (!audio || state !== "playing" || audio.paused || audio.seeking || audio.readyState < 2 || audio.playbackRate !== 1) return null;
      const now = performance.now();
      // A worker result captured before this playback belongs to the previous
      // audio session, even if subtracting its age would clamp it to beat zero.
      if (capturedAtMs !== undefined && (!Number.isFinite(capturedAtMs) || capturedAtMs < playbackStartedAt)) return null;
      const position = audio.currentTime * 1000;
      const duration = audio.duration * 1000;
      if (!Number.isFinite(position)) return null;
      const wrapped = Number.isFinite(duration) && duration > 0 && lastPosition - position > duration / 2;
      if (wrapped) loops++;
      else if (position < lastPosition) {
        // A correction/seek is not evidence of playback. Invalidate the sample
        // and wait for forward progress so motion cannot reuse its old onset.
        lastPosition = position; lastAdvancedAt = -Infinity;
        return null;
      }
      if (position > lastPosition || wrapped) lastAdvancedAt = now;
      lastPosition = position;
      if (now - lastAdvancedAt > clockStallMs) return null;
      const ageMs = capturedAtMs === undefined ? 0 : Math.max(0, now - capturedAtMs);
      return Math.max(0, position + (Number.isFinite(duration) ? loops * duration : 0) - ageMs);
    },
  };
}
