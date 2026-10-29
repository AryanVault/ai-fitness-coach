import { expect, it } from "vitest";
import { evaluateSafety } from "./safety";
it("does not generate geometry-based safety claims for hidden joints", () => {
  const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:.1}));
  const result=evaluateSafety("squat",points);
  expect(result.severity).toBe("info");
  expect(result.messages[0]).toMatch(/unavailable/i);
  expect(evaluateSafety("squat",points,["knee sensitivity"]).blocked).toBe(true);
});
