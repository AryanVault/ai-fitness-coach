import { describe, expect, it } from "vitest";
import { decodeMoveNet, modelForMode } from "./providers";

describe("local pose provider contracts", () => {
  it("keeps automatic tracking conservative and makes the alternative explicit", () => {
    expect(modelForMode("auto")).toEqual({provider:"mediapipe",quality:"full"});
    expect(modelForMode("detail")).toEqual({provider:"mediapipe",quality:"heavy"});
    expect(modelForMode("alternative")).toEqual({provider:"movenet",quality:"thunder"});
  });
  it("unletterboxes 17 keypoints into canonical slots without fabricating fingers, toes or depth", () => {
    const output = Array.from({length:17},()=>[.5,.5,.95]).flat();
    output[9*3]=.25; output[9*3+1]=.2;
    const points = decodeMoveNet(output,{width:1280,height:720});
    expect(points).toHaveLength(33);
    expect(points[15].x).toBeCloseTo(.2);
    expect(points[15].y).toBeCloseTo((.25*256-56)/144);
    expect(points[15].z).toBeUndefined();
    expect(points[17].visibility).toBe(0);
    expect(points[31].visibility).toBe(0);
    expect(points[11].visibility).toBe(.95);
  });
  it("rejects malformed output and hides keypoints outside the original image", () => {
    expect(()=>decodeMoveNet([NaN],{width:640,height:480})).toThrow();
    const output = Array.from({length:17},()=>[0,.5,.99]).flat();
    expect(decodeMoveNet(output,{width:1280,height:720})[11].visibility).toBe(0);
  });
});
