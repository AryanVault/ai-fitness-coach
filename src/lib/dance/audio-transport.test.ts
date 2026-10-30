import { describe, expect, it, vi } from "vitest";
import { createRoutineAudioTransport } from "./audio-transport";

function fakeAudio() {
  return { paused: true, error: null, seeking: false, readyState: 4, playbackRate: 1, currentTime: 0, duration: 60,
    pause: vi.fn(function(this: { paused: boolean }) { this.paused = true; }), removeAttribute: vi.fn(), load: vi.fn(),
    play: vi.fn(async function(this: { paused: boolean }) { this.paused = false; }), onerror: null, onpause: null,
  };
}
describe("routine audio transport", () => {
  it("suppresses beat timing if the audio clock freezes despite a playing state", async () => {
    const clock=vi.spyOn(performance,"now").mockReturnValue(1000);
    try {
      const audio=fakeAudio();const transport=createRoutineAudioTransport({createAudio:()=>audio as unknown as HTMLAudioElement});
      await transport.start("/routine.wav");audio.currentTime=1;
      expect(transport.positionMs()).toBe(1000);
      clock.mockReturnValue(2000);
      expect(transport.positionMs()).toBeNull();
      transport.stop();
    } finally {clock.mockRestore();}
  });
  it("uses the audio clock and unwraps loops, then releases audio on stop", async () => {
    const audio = fakeAudio(); const transport = createRoutineAudioTransport({ createAudio: () => audio as unknown as HTMLAudioElement });
    expect(await transport.start("/routine.wav")).toBe(true);
    audio.currentTime = 59.9; expect(transport.positionMs()).toBe(59900);
    audio.currentTime = .1; expect(transport.positionMs()).toBe(60100);
    transport.stop(); expect(audio.pause).toHaveBeenCalled(); expect(audio.removeAttribute).toHaveBeenCalledWith("src");
    expect(transport.positionMs()).toBeNull();
  });
  it("tolerates 100 ms media-clock quantization and recovers only on clock advancement", async () => {
    const clock = vi.spyOn(performance, "now").mockReturnValue(1000);
    try {
      const audio = fakeAudio();
      const transport = createRoutineAudioTransport({ createAudio: () => audio as unknown as HTMLAudioElement });
      await transport.start("/routine.wav"); audio.currentTime = 1;
      expect(transport.positionMs()).toBe(1000);
      for (const now of [1033, 1066, 1099]) {
        clock.mockReturnValue(now);
        expect(transport.positionMs()).toBe(1000);
      }
      clock.mockReturnValue(1100); audio.currentTime = 1.1;
      expect(transport.positionMs()).toBe(1100);
      clock.mockReturnValue(1400);
      expect(transport.positionMs()).toBeNull();
      clock.mockReturnValue(1433);
      expect(transport.positionMs()).toBeNull();
      clock.mockReturnValue(1500); audio.currentTime = 1.2;
      expect(transport.positionMs()).toBe(1200);
      transport.stop();
    } finally { clock.mockRestore(); }
  });
  it("rejects camera captures from before the current audio playback", async () => {
    const clock = vi.spyOn(performance, "now").mockReturnValue(1000);
    try {
      const audio = fakeAudio();
      const secondAudio = fakeAudio();
      const createAudio = vi.fn().mockReturnValueOnce(audio).mockReturnValueOnce(secondAudio);
      const transport = createRoutineAudioTransport({ createAudio });
      await transport.start("/first.wav");
      clock.mockReturnValue(2000); audio.currentTime = 1;
      expect(transport.positionMs(1900)).toBe(900);
      clock.mockReturnValue(2100); await transport.start("/second.wav"); secondAudio.currentTime = .1;
      clock.mockReturnValue(2200);
      expect(transport.positionMs(2000)).toBeNull();
      expect(transport.positionMs(2150)).toBe(50);
      expect(transport.positionMs(Number.NaN)).toBeNull();
      transport.stop();
    } finally { clock.mockRestore(); }
  });
  it("invalidates a backwards clock correction instead of treating it as progress", async () => {
    const audio = fakeAudio();
    const transport = createRoutineAudioTransport({ createAudio: () => audio as unknown as HTMLAudioElement });
    await transport.start("/routine.wav"); audio.currentTime = 1;
    expect(transport.positionMs()).toBe(1000);
    audio.currentTime = .9;
    expect(transport.positionMs()).toBeNull();
    expect(transport.positionMs()).toBeNull();
    audio.currentTime = 1;
    expect(transport.positionMs()).toBe(1000);
    transport.stop();
  });
  it("makes timing unavailable when playback is blocked or stalled", async () => {
    const audio = fakeAudio(); audio.play.mockRejectedValueOnce(new Error("NotAllowedError"));
    const transport = createRoutineAudioTransport({ createAudio: () => audio as unknown as HTMLAudioElement });
    expect(await transport.start("/routine.wav")).toBe(false); expect(transport.state).toBe("unavailable");
    expect(transport.positionMs()).toBeNull();
    await transport.start("/routine.wav"); audio.paused = true; expect(transport.positionMs()).toBeNull();
  });
  it("cannot resume cancelled audio after pending play resolves", async () => {
    const audio = fakeAudio(); let release!: () => void;
    audio.play.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
    const transport = createRoutineAudioTransport({ createAudio: () => audio as unknown as HTMLAudioElement });
    const pending = transport.start("/routine.wav"); transport.stop(); release();
    expect(await pending).toBe(false); expect(transport.state).toBe("idle"); expect(transport.positionMs()).toBeNull();
  });
});
