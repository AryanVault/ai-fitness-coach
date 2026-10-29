import { average } from "@/lib/pose/math";
import type { LiveMetric } from "@/lib/pose/types";

export type ScoreKey = "form" | "rom" | "tempo" | "stability" | "symmetry" | "consistency" | "endurance" | "safety" | "overall";

export function aggregateScoreEvidence(metrics: LiveMetric[]) {
  const observed = metrics.filter(m => m.reliable !== false && Number.isFinite(m.score));
  const mean = (items: LiveMetric[]) => items.length ? Math.round(average(items.map(m => m.score))) : 0;
  const named = (pattern: RegExp) => observed.filter(m => pattern.test(m.name));
  const rom = named(/Range|Depth|Finish|Extension|Reach|Front Knee/i);
  const tempo = named(/Tempo/i);
  const stability = named(/Stability|Stack|Control|Body Line|Hip Level/i);
  const symmetry = named(/Symmetry|Balance|Centering/i);
  return {
    form: mean(observed), rom: mean(rom), tempo: mean(tempo), stability: mean(stability), symmetry: mean(symmetry),
    consistency: 0, endurance: 0, safety: 0, overall: mean(observed),
    scoreAvailability: {
      form: observed.length > 0, rom: rom.length > 0, tempo: tempo.length > 0,
      stability: stability.length > 0, symmetry: symmetry.length > 0,
      consistency: false, endurance: false, safety: false, overall: observed.length > 0,
    } satisfies Record<ScoreKey, boolean>,
  };
}
