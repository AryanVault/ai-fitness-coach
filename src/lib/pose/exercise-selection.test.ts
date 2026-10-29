import { describe, expect, it } from "vitest";
import { selectCoachExercise } from "./exercise-selection";

describe("coach deep links", () => {
  it.each([
    "squat",
    "pushup",
    "lunge",
    "bicep_curl",
    "jumping_jack",
    "plank",
    "warrior",
  ])("opens the requested supported exercise: %s", (id) => {
    expect(selectCoachExercise("workout", id)).toBe(id);
  });
  it.each([null, "", "deadlift", "demo-squat", "dance_basic", "<script>"])(
    "uses the safe default for unsupported input: %s",
    (id) => {
      expect(selectCoachExercise("workout", id)).toBe("squat");
    },
  );
  it("does not select a workout-only movement in dance mode", () => {
    expect(selectCoachExercise("dance", "bicep_curl")).toBe("dance_basic");
    expect(selectCoachExercise("dance", "jumping_jack")).toBe("jumping_jack");
  });
});
