import { describe, expect, it } from "vitest";
import { createDanceMotionTracker } from "./motion";
import type { Landmark } from "@/lib/pose/types";

export function motionPose(amount = 0, scale = 1): Landmark[] {
  const points = Array.from({ length: 33 }, () => ({ x: .5, y: .5, visibility: .99 }));
  for (const [index, x, y] of [[11,.4,.25],[12,.6,.25],[15,.28-amount,.4],[16,.72+amount,.4],[23,.44,.5],[24,.56,.5],[27,.44,.9],[28,.56,.9]]) {
    points[index] = { x: .5 + (x - .5) * scale, y: .5 + (y - .5) * scale, visibility: .99 };
  }
  return points;
}

describe("movement-based beat evidence", () => {
  it("measures bounce from hip-to-foot motion history instead of a front-view knee angle", () => {
    const tracker = createDanceMotionTracker(); let result;
    for(let t=0;t<=1400;t+=40) {
      const landmarks = motionPose();
      landmarks[23].y += Math.sin(t / 500 * Math.PI * 2) * .02;
      landmarks[24].y += Math.sin(t / 500 * Math.PI * 2) * .02;
      result = tracker.update({ landmarks, timestampMs:t, routineMs:t, bpm:120, synchronized:true });
    }
    expect(result?.bounceReliable).toBe(true);
    expect(result?.bounceAmplitude).toBeGreaterThan(.15);
    expect(result?.bounceAmplitude).toBeLessThan(.25);
  });
  it("never scores stationary history, even exactly on a beat", () => {
    const tracker = createDanceMotionTracker();
    for (let t = 0; t <= 3000; t += 40) expect(tracker.update({ landmarks: motionPose(), timestampMs: t, routineMs: t, bpm: 120, synchronized: true }).timingReliable).toBe(false);
  });
  it("distinguishes on-beat and off-beat movement and preserves scale invariance", () => {
    const run = (offset: number, scale = 1) => {
      const tracker = createDanceMotionTracker();
      for (let t = 0; t <= 480; t += 40) tracker.update({ landmarks: motionPose(0, scale), timestampMs: t, routineMs: t + offset, bpm: 120, synchronized: true });
      return tracker.update({ landmarks: motionPose(.06, scale), timestampMs: 520, routineMs: 520 + offset, bpm: 120, synchronized: true });
    };
    expect(run(0).timingScore).toBe(100);
    expect(run(0).offsetMs).toBe(0);
    expect(run(200).timingScore).toBe(20);
    expect(run(0,.5).timingScore).toBe(run(0).timingScore);
  });
  it("expires stale events and clears evidence on occlusion, clock jumps and gaps", () => {
    const tracker = createDanceMotionTracker();
    const update = (t: number, amount = 0, routineMs = t) => tracker.update({ landmarks: motionPose(amount), timestampMs: t, routineMs, bpm: 120, synchronized: true });
    update(480); expect(update(520,.06).timingReliable).toBe(true);
    for(let t=560;t<=1600;t+=40) update(t,.06);
    expect(update(1640,.06).timingReliable).toBe(false);
    expect(update(2400,.12).timingReliable).toBe(false);
    expect(update(2440,.18,3000).timingReliable).toBe(false);
    const hidden = motionPose(); hidden[15].visibility = .1;
    expect(tracker.update({ landmarks: hidden, timestampMs: 2480, routineMs: 3040, bpm: 120, synchronized: true }).timingReliable).toBe(false);
  });
  it("does not score silently or at an ambiguous sampling interval", () => {
    const tracker = createDanceMotionTracker();
    tracker.update({ landmarks: motionPose(), timestampMs: 0, routineMs: 0, bpm: 120, synchronized: true });
    expect(tracker.update({ landmarks: motionPose(.2), timestampMs: 250, routineMs: 250, bpm: 120, synchronized: true }).timingReliable).toBe(false);
    expect(tracker.update({ landmarks: motionPose(.3), timestampMs: 290, routineMs: 290, bpm: 120, synchronized: false }).timingReliable).toBe(false);
  });
});
