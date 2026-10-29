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
  const setState = (next: RoutineAudioState) => { state = next; options.onState?.(next); };
  const stop = () => {
    generation++;
    if (audio) { audio.onerror = null; audio.onpause = null; audio.pause(); audio.removeAttribute("src"); audio.load(); }
    audio = null; loops = 0; lastPosition = 0; setState("idle");
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
        setState("playing"); return true;
      } catch {
        if (token === generation) { created.pause(); setState("unavailable"); }
        return false;
      } finally { if (timer) clearTimeout(timer); }
    },
    positionMs(capturedAtMs?: number): number | null {
      if (!audio || state !== "playing" || audio.paused || audio.seeking || audio.readyState < 2 || audio.playbackRate !== 1) return null;
      const position = audio.currentTime * 1000;
      const duration = audio.duration * 1000;
      if (!Number.isFinite(position)) return null;
      if (Number.isFinite(duration) && duration > 0 && lastPosition - position > duration / 2) loops++;
      lastPosition = position;
      const ageMs = capturedAtMs === undefined ? 0 : Math.max(0, performance.now() - capturedAtMs);
      return Math.max(0, position + (Number.isFinite(duration) ? loops * duration : 0) - ageMs);
    },
  };
}
