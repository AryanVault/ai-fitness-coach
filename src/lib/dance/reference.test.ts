import { expect, it } from "vitest";
import { referenceSegmentAt } from "./reference";
import routine from "../../../public/routines/starter-groove-pack.json";
import type { DanceRoutinePack } from "./types";
it("interpolates supplied keyframes but keeps starter poses labeled as checkpoints", () => {
  const pack: DanceRoutinePack = { ...routine, segments: [{ ...routine.segments[0], referenceKeyframes: [
    {timeMs:0,targetLandmarks:{leftWrist:{x:-1,y:0}}}, {timeMs:1000,targetLandmarks:{leftWrist:{x:1,y:1}}},
  ] }] } as DanceRoutinePack;
  expect(referenceSegmentAt(pack,500)?.targetLandmarks.leftWrist).toEqual({x:0,y:.5});
  expect(referenceSegmentAt(routine as DanceRoutinePack,0)?.referenceKeyframes).toBeUndefined();
});
it("aligns each packaged phrase boundary and the audio loop to whole eight-counts", () => {
  const beatMs = 60000 / routine.bpm;
  for(const segment of routine.segments) {
    expect(segment.startMs / (beatMs*8)).toBeCloseTo(Math.round(segment.startMs/(beatMs*8)));
    expect(segment.endMs / (beatMs*8)).toBeCloseTo(Math.round(segment.endMs/(beatMs*8)));
  }
});
