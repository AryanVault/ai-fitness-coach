import { expect, it } from "vitest";
import { createRuntimeSamples } from "./runtime-samples";
it("keeps timing distributions scoped to the actual model and survives a missing final frame",()=>{
  const samples=createRuntimeSamples();
  samples.add({provider:"movenet",modelQuality:"thunder",delegate:"WASM",inferenceLatencyMs:120});
  samples.add({provider:"movenet",modelQuality:"thunder",delegate:"WASM",inferenceLatencyMs:140});
  samples.add(null);
  expect(samples.report()).toMatchObject({provider:"movenet",model:"thunder",sampleCount:2,inferenceP50Ms:120});
  samples.add({provider:"mediapipe",modelQuality:"full",delegate:"CPU",inferenceLatencyMs:20});
  expect(samples.report()).toMatchObject({provider:"mediapipe",model:"full",sampleCount:1,inferenceP95Ms:20});
  samples.reset();expect(samples.report()).toBeUndefined();
});
