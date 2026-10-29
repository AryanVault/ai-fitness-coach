import { EMPTY_DANCE_MOTION, type DanceMotionEvidence } from "@/lib/dance/motion";
import { referenceSegmentAt } from "@/lib/dance/reference";
import { average, clamp, distance, midpoint, scoreFromRange, scoreFromTarget } from "@/lib/pose/math";
import type { FrameAnalysis, Landmark } from "@/lib/pose/types";
import type { DanceComparison, DanceMetricGrade, DanceMetricKey, DanceRoutinePack, DanceRoutineTargetPoint } from "@/lib/dance/types";

const INDEX_BY_POINT: Record<DanceRoutineTargetPoint, number> = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
};

function normalizeLandmark(point: Landmark | undefined, center: Landmark | null, shoulderWidth: number) {
  if (!point || !center || shoulderWidth <= 0.0001) {
    return null;
  }

  return {
    x: (point.x - center.x) / shoulderWidth,
    y: (point.y - center.y) / shoulderWidth,
  };
}

function gradeStatus(score: number, reliable: boolean): DanceMetricGrade["status"] {
  if (!reliable) return "unreliable";
  if (score >= 84) return "pass";
  if (score >= 68) return "warning";
  return "fail";
}

function danceMetric(options: {
  key: DanceMetricKey;
  label: string;
  score: number;
  value?: number;
  target?: string;
  reliable: boolean;
  passDetail: string;
  warningDetail: string;
}) {
  const status = gradeStatus(options.score, options.reliable);
  return {
    key: options.key,
    label: options.label,
    score: options.score,
    value: options.value,
    target: options.target,
    status,
    reliable: options.reliable,
    detail: status === "pass" ? options.passDetail : status === "unreliable" ? `${options.label} is not reliable until the full hip-hop frame is visible.` : options.warningDetail,
  };
}

export function compareDanceFrame({
  landmarks,
  routine,
  elapsedMs,
  motion = EMPTY_DANCE_MOTION,
}: {
  landmarks: Landmark[];
  routine: DanceRoutinePack;
  elapsedMs: number;
  analysis: FrameAnalysis;
  motion?: DanceMotionEvidence;
}): DanceComparison | null {
  if (!landmarks.length || !routine.segments.length) {
    return null;
  }

  const segment = referenceSegmentAt(routine, elapsedMs);
  if (!segment) {
    return null;
  }

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const center = midpoint(leftShoulder, rightShoulder);
  const shoulderWidth = distance(leftShoulder, rightShoulder);
  const targetPointEntries = Object.entries(segment.targetLandmarks);
  const visibleTargetPoints = targetPointEntries.filter(([pointName]) => {
    const landmark = landmarks[INDEX_BY_POINT[pointName as DanceRoutineTargetPoint]];
    return (landmark?.visibility ?? 0) >= 0.52;
  }).length;
  const landmarkReliability = targetPointEntries.length ? visibleTargetPoints / targetPointEntries.length : 1;
  const visible = (indices: number[]) => indices.every(i => (landmarks[i]?.visibility ?? 0) >= .52);
  const fullFrameReliable = shoulderWidth >= .001 && landmarkReliability === 1;
  const armsReliable = fullFrameReliable && visible([11, 12, 15, 16]);
  const legsReliable = visible([23, 24, 25, 26, 27, 28]);
  const torsoReliable = visible([11, 12, 23, 24]);
  // Legacy target ranges use a canonical shoulder width of .2 image units.
  const bodyScale = shoulderWidth > .001 ? .2 / shoulderWidth : 0;

  const landmarkScores = targetPointEntries.map(([pointName, target]) => {
    const actual = normalizeLandmark(landmarks[INDEX_BY_POINT[pointName as DanceRoutineTargetPoint]], center, shoulderWidth);
    if (!actual || !target) {
      return 0;
    }

    const delta = Math.hypot(actual.x - target.x, actual.y - target.y);
    return scoreFromTarget(delta, 0, 0.38);
  });

  const frameWidth = distance(leftWrist, rightWrist) * 100 * bodyScale;
  const armLift = average([
    ((leftShoulder?.y ?? 0) - (leftWrist?.y ?? 0)) * 100 * bodyScale,
    ((rightShoulder?.y ?? 0) - (rightWrist?.y ?? 0)) * 100 * bodyScale,
  ]);
  const torsoLean = Math.abs((center?.x ?? 0) - ((midpoint(leftHip, rightHip)?.x ?? center?.x ?? 0))) * 100 * bodyScale;
  const symmetry = average([
    Math.abs((leftShoulder?.y ?? 0) - (rightShoulder?.y ?? 0)) * 100 * bodyScale,
    Math.abs((leftHip?.y ?? 0) - (rightHip?.y ?? 0)) * 100 * bodyScale,
  ]);
  const bounceAmplitude = motion.bounceAmplitude ?? 0;

  const metricScores = [
    scoreFromRange(frameWidth, segment.targetMetrics.frameWidth[0], segment.targetMetrics.frameWidth[1], 12),
    scoreFromRange(armLift, segment.targetMetrics.armLift[0], segment.targetMetrics.armLift[1], 10),
    scoreFromTarget(torsoLean, 0, segment.targetMetrics.torsoLeanMax),
    scoreFromRange(bounceAmplitude, .04, .35, .04),
    scoreFromTarget(symmetry, 0, segment.targetMetrics.symmetryMax),
  ];

  const loopMs = routine.durationMs > 0 ? elapsedMs % routine.durationMs : elapsedMs;
  const timingScore = motion.timingReliable ? motion.timingScore : 0;
  const segmentCompletion = clamp(
    Math.round((((loopMs - segment.startMs) / Math.max(segment.endMs - segment.startMs, 1)) * 100)),
    0,
    100,
  );
  const transitionQuality = motion.transitionReliable ? motion.transitionScore : 0;
  const poseSimilarity = Math.round(average([...landmarkScores, metricScores[0], metricScores[1], metricScores[2], metricScores[4]]));
  const targetFrameWidth = `${segment.targetMetrics.frameWidth[0]}-${segment.targetMetrics.frameWidth[1]} width`;
  const targetArmLift = `${segment.targetMetrics.armLift[0]}-${segment.targetMetrics.armLift[1]} lift`;
  const metrics: Record<DanceMetricKey, DanceMetricGrade> = {
    poseShape: danceMetric({
      key: "poseShape",
      label: "Pose shape",
      score: poseSimilarity,
      value: poseSimilarity,
      target: segment.focus,
      reliable: fullFrameReliable,
      passDetail: `${segment.label} shape matches the hip-hop checkpoint.`,
      warningDetail: `Match the ${segment.focus.toLowerCase()} shape more closely in this phrase.`,
    }),
    grooveBounce: danceMetric({
      key: "grooveBounce",
      label: "Bounce range",
      score: metricScores[3],
      value: Number(bounceAmplitude.toFixed(2)),
      target: "0.04-0.35 shoulder widths of hip-to-foot height change over two beats",
      reliable: legsReliable && Boolean(motion.bounceReliable),
      passDetail: "Visible hip-to-foot height changes through the groove.",
      warningDetail: bounceAmplitude < .04 ? "No clear bounce observed in the recent movement window." : "Keep the bounce smaller and controlled.",
    }),
    armHits: danceMetric({
      key: "armHits",
      label: "Arm hits",
      score: Math.round(average([metricScores[0], metricScores[1]])),
      value: Number(frameWidth.toFixed(1)),
      target: `${targetFrameWidth}; ${targetArmLift}`,
      reliable: armsReliable,
      passDetail: "Arm shape lands wide and readable for the count.",
      warningDetail: frameWidth < segment.targetMetrics.frameWidth[0] ? "Make the arm hit wider and more confident on the beat." : "Control the arms so the hit stays sharp instead of overextended.",
    }),
    torsoControl: danceMetric({
      key: "torsoControl",
      label: "Torso control",
      score: Math.round(average([metricScores[2], metricScores[4]])),
      value: Number(torsoLean.toFixed(1)),
      target: `0-${segment.targetMetrics.torsoLeanMax} lean`,
      reliable: torsoReliable,
      passDetail: "Ribs and hips stay stacked through the phrase.",
      warningDetail: "Stack ribs over hips before the next count so the groove stays centered.",
    }),
    timing: danceMetric({
      key: "timing",
      label: "Timing",
      score: timingScore,
      value: motion.offsetMs ?? undefined,
      target: "movement onset on the nearest audio beat",
      reliable: motion.timingReliable,
      passDetail: "Detected movement starts close to the audio beat.",
      warningDetail: motion.offsetMs != null && motion.offsetMs < 0 ? "Movement started before the beat. Wait for the count." : "Movement started after the beat. Prepare the next hit earlier.",
    }),
    transition: danceMetric({
      key: "transition",
      label: "Transition",
      score: transitionQuality,
      value: transitionQuality,
      target: "stable and symmetrical between phrases",
      reliable: fullFrameReliable && motion.transitionReliable,
      passDetail: "Transition is controlled before the next phrase.",
      warningDetail: "Clean up the transition before the next segment instead of carrying momentum through it.",
    }),
  };
  if (!motion.timingReliable) metrics.timing.detail = motion.reason;
  if (!motion.transitionReliable) metrics.transition.detail = "Move through a visible sequence to measure transition smoothness.";
  const observed = Object.values(metrics).filter(m => m.reliable);
  const overall = observed.length ? Math.round(average(observed.map(m => m.score))) : 0;
  const failedMetrics = Object.values(metrics)
    .filter((metric) => metric.reliable && metric.status === "fail")
    .map((metric) => metric.label);
  const primaryIssue = Object.values(metrics)
    .filter((metric) => metric.reliable && metric.status !== "pass")
    .sort((a, b) => a.score - b.score)[0]?.detail;
  const reliability = Math.round(landmarkReliability * 100);

  const notes = [
    primaryIssue ?? "",
    reliability < 72 ? "Dance scoring is partially limited because key wrists, shoulders, hips, or knees are not fully visible." : "",
  ].filter(Boolean);

  return {
    segment,
    timingOffsetMs: motion.offsetMs,
    timingUncertaintyMs: motion.samplingUncertaintyMs,
    motionEventId: motion.eventId,
    referenceKind: segment.referenceKeyframes?.length ? "keyframes" : "checkpoint",
    poseSimilarity,
    timingScore,
    segmentCompletion,
    transitionQuality,
    overall,
    metrics,
    failedMetrics,
    primaryIssue,
    reliability,
    notes,
  };
}
