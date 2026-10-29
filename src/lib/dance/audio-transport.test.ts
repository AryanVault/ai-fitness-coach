import { describe, expect, it, vi } from "vitest";
import { createRoutineAudioTransport } from "./audio-transport";

function fakeAudio() {
  return { paused: true, error: null, seeking: false, readyState: 4, playbackRate: 1, currentTime: 0, duration: 60,
    pause: vi.fn(function(this: { paused: boolean }) { this.paused = true; }), removeAttribute: vi.fn(), load: vi.fn(),
    play: vi.fn(async function(this: { paused: boolean }) { this.paused = false; }), onerror: null, onpause: null,
  };
}
describe("routine audio transport", () => {
  it("uses the audio clock and unwraps loops, then releases audio on stop", async () => {
    const audio = fakeAudio(); const transport = createRoutineAudioTransport({ createAudio: () => audio as unknown as HTMLAudioElement });
    expect(await transport.start("/routine.wav")).toBe(true);
    audio.currentTime = 59.9; expect(transport.positionMs()).toBe(59900);
    audio.currentTime = .1; expect(transport.positionMs()).toBe(60100);
    transport.stop(); expect(audio.pause).toHaveBeenCalled(); expect(audio.removeAttribute).toHaveBeenCalledWith("src");
    expect(transport.positionMs()).toBeNull();
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
