import { z } from "zod";
import { createDanceMotionTracker } from "./motion";
import { toAnalysisLandmarks } from "@/lib/pose/math";

const landmark = z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite().optional(), visibility: z.number().min(0).max(1) });
export const movementReplaySchema = z.object({
  version: z.literal("movement-replay-v1"),
  cases: z.array(z.object({
    id: z.string().min(1).max(100), synthetic: z.boolean(), annotationSource: z.string().min(1).max(200),
    device: z.string().min(1).max(100), bpm: z.number().min(30).max(240),
    expectedOnsetsMs: z.array(z.number().nonnegative()).max(5000),
    frames: z.array(z.object({ timestampMs: z.number().nonnegative(), routineMs: z.number().nonnegative(), aspectRatio: z.number().positive().max(4), synchronized: z.boolean(), landmarks: z.array(landmark).length(33) })).min(2).max(100000),
  })).min(1).max(200),
});
export type MovementReplay = z.infer<typeof movementReplaySchema>;

export function benchmarkMovementReplay(input: MovementReplay) {
  const validated = movementReplaySchema.parse(input);
  return {
    analysisVersion: "movement-engine-v3" as const,
    benchmarkVersion: validated.version,
    latencyScope: "JavaScript movement analysis only; excludes camera capture and pose inference",
    cases: validated.cases.map(clip => {
      const tracker = createDanceMotionTracker(); const latencies: number[] = []; const detections: number[] = [];
      let lastId: number | null = null;
      for (const frame of clip.frames) {
        const begin = performance.now();
        const result = tracker.update({ ...frame, bpm: clip.bpm, landmarks: toAnalysisLandmarks(frame.landmarks, frame.aspectRatio) });
        latencies.push(performance.now() - begin);
        if (result.eventId !== null && result.eventId !== lastId && result.onsetRoutineMs != null) { detections.push(result.onsetRoutineMs); lastId = result.eventId; }
      }
      const unmatched = new Set(clip.expectedOnsetsMs.map((_, i) => i)); const errors: number[] = [];
      for (const time of detections) {
        const match = [...unmatched].sort((a,b) => Math.abs(time-clip.expectedOnsetsMs[a]) - Math.abs(time-clip.expectedOnsetsMs[b]))[0];
        if (match !== undefined && Math.abs(time - clip.expectedOnsetsMs[match]) <= 150) { errors.push(Math.abs(time-clip.expectedOnsetsMs[match])); unmatched.delete(match); }
      }
      latencies.sort((a,b) => a-b);
      return {
        id: clip.id, synthetic: clip.synthetic, annotationSource: clip.annotationSource, device: clip.device,
        frames: clip.frames.length, expectedEvents: clip.expectedOnsetsMs.length, detectedEvents: detections.length,
        truePositives: errors.length, falsePositives: detections.length-errors.length, falseNegatives: unmatched.size,
        meanAbsoluteOnsetErrorMs: errors.length ? errors.reduce((a,b) => a+b,0)/errors.length : null,
        processingP50Ms: latencies[Math.floor((latencies.length-1)*.5)], processingP95Ms: latencies[Math.floor((latencies.length-1)*.95)],
      };
    }),
  };
}
