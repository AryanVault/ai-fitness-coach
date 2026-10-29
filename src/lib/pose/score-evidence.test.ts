import { describe, expect, it } from "vitest";
import { aggregateScoreEvidence } from "./score-evidence";
import type { LiveMetric } from "./types";
const metric = (name: string, score: number, reliable = true): LiveMetric => ({ name, score, reliable, status: "good", detail: name });
describe("observable score aggregation", () => {
  it("excludes unreliable and non-finite scores from every aggregate", () => {
    const result = aggregateScoreEvidence([metric("Depth", 5, false), metric("Torso Stack", 90), metric("Symmetry", NaN)]);
    expect(result.overall).toBe(90); expect(result.form).toBe(90);
    expect(result.scoreAvailability.rom).toBe(false); expect(result.rom).toBe(0);
    expect(result.scoreAvailability.tempo).toBe(false);
    expect(result.scoreAvailability.endurance).toBe(false);
    expect(result.scoreAvailability.safety).toBe(false);
  });
  it("does not manufacture a control score for an empty observation", () => {
    expect(aggregateScoreEvidence([]).overall).toBe(0);
    expect(aggregateScoreEvidence([]).scoreAvailability.overall).toBe(false);
  });
});
