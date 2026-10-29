import { describe, expect, it } from "vitest";
import { buildTrackingFrame, evaluateConfidence, smoothLandmarks } from "@/lib/pose/confidence";
import { inferCameraView } from "@/lib/pose/quality";
import type { Landmark } from "@/lib/pose/types";

const pose = (): Landmark[] => {
  const points = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: .99 }));
  points[11] = { x: .4, y: .24, z: -.02, visibility: .99 };
  points[12] = { x: .6, y: .24, z: .02, visibility: .99 };
  points[23] = { x: .43, y: .5, z: -.01, visibility: .99 };
  points[24] = { x: .57, y: .5, z: .01, visibility: .99 };
  [25, 26, 27, 28].forEach((i, n) => { points[i] = { x: n % 2 ? .57 : .43, y: n < 2 ? .68 : .9, z: 0, visibility: .99 }; });
  return points;
};

describe("current tracking evidence", () => {
  it("honors worker ambiguity and rejects analysis older than 350 ms", () => {
    const frame = buildTrackingFrame({ exerciseId: "squat", rawLandmarks: pose(), previousSmoothed: null, timestampMs: 100, frameIndex: 1, fps: 24, brightness: 80 });
    const ambiguous = evaluateConfidence({...frame,frameQuality:"occluded",frameQualityMessage:"More than one person detected."},"squat");
    expect(ambiguous.ready).toBe(false); expect(ambiguous.message).toMatch(/one person/);
    expect(evaluateConfidence({...frame,frameAgeMs:400},"squat").ready).toBe(false);
    expect(evaluateConfidence({...frame,frameAgeMs:50},"squat").ready).toBe(true);
  });
  it("never smooths away sudden critical-joint visibility loss", () => {
    const prior = pose(); const next = pose(); next[27].visibility = 0;
    expect(smoothLandmarks(prior, next)[27].visibility).toBe(0);
    const frame = buildTrackingFrame({ exerciseId: "squat", rawLandmarks: next, previousSmoothed: prior, timestampMs: 100, frameIndex: 2, fps: 24, brightness: 80 });
    expect(frame.reliability.fullBody).toBe(false);
    expect(frame.frameQuality).not.toBe("ready");
  });
  it("keeps camera view invariant to distance with and without world landmarks", () => {
    const near = pose();
    const far = near.map(p => ({ ...p, x: .5 + (p.x - .5) * .5, y: .5 + (p.y - .5) * .5, z: (p.z ?? 0) * .5 }));
    expect(inferCameraView(near, [])).toBe("front");
    expect(inferCameraView(far, [])).toBe("front");
    expect(inferCameraView(far, near)).toBe("front");
  });
});
