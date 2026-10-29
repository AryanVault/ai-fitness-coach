import type { ExerciseId } from "@/lib/pose/types";

export const COACH_EXERCISES: Record<"workout" | "dance", ExerciseId[]> = {
  workout: [
    "squat",
    "pushup",
    "lunge",
    "bicep_curl",
    "jumping_jack",
    "plank",
    "warrior",
  ],
  dance: ["dance_basic", "jumping_jack"],
};

/** Query parameters can select only movements supported by the active coach. */
export function selectCoachExercise(
  mode: "workout" | "dance",
  requested: string | null,
): ExerciseId {
  return (
    COACH_EXERCISES[mode].find((id) => id === requested) ??
    (mode === "dance" ? "dance_basic" : "squat")
  );
}
