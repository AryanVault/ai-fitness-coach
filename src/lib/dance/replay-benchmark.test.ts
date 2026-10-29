import { expect, it } from "vitest";
import { benchmarkMovementReplay, movementReplaySchema } from "./replay-benchmark";
import { syntheticMovementReplay } from "../../../fixtures/movement-engine/synthetic";
it("replays cadence and distance fixtures without false or missed events", () => {
  const report = benchmarkMovementReplay(syntheticMovementReplay);
  expect(report.analysisVersion).toBe("movement-engine-v3");
  for(const result of report.cases) { expect(result.falsePositives).toBe(0); expect(result.falseNegatives).toBe(0); }
});
it("rejects unlabeled and malformed replay input", () => {
  expect(movementReplaySchema.safeParse({version:"movement-replay-v1",cases:[{id:"bad"}]}).success).toBe(false);
});
