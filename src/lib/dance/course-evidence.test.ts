import { expect, it } from "vitest";
import { hasDanceTimingEvidence } from "./course-rules";
it("requires both observed phrase coverage and distinct timing events", () => {
  expect(hasDanceTimingEvidence({timingEvents:0,observedDurationMs:10000,phraseDurationMs:10000})).toBe(false);
  expect(hasDanceTimingEvidence({timingEvents:8,observedDurationMs:100,phraseDurationMs:10000})).toBe(false);
  expect(hasDanceTimingEvidence({timingEvents:3,observedDurationMs:6000,phraseDurationMs:10000})).toBe(true);
});
