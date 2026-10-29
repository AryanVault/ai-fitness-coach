"use client";

import { useEffect, useId, useState } from "react";
import { useReducedMotion } from "motion/react";
import { angle } from "@/lib/pose/math";

type Point = { x: number; y: number };
type Pose = {
  head: Point;
  shoulder: Point;
  elbow: Point;
  hand: Point;
  hip: Point;
  knee: Point;
  ankle: Point;
};
type Movement = "squat" | "curl" | "lunge";
const movements: { id: Movement; name: string; joint: string; note: string }[] =
  [
    {
      id: "squat",
      name: "Squat",
      joint: "Knee",
      note: "A side view helps the coach follow your knee and hip movement.",
    },
    {
      id: "curl",
      name: "Bicep curl",
      joint: "Elbow",
      note: "A side view helps the coach follow your elbow through each rep.",
    },
    {
      id: "lunge",
      name: "Lunge",
      joint: "Knee",
      note: "Keep your whole body in view, with space around your feet.",
    },
  ];

function position(movement: Movement, progress: number): Pose {
  const t = progress / 100;
  if (movement === "curl") {
    const a = ((75 - t * 130) * Math.PI) / 180;
    return {
      head: { x: 505, y: 112 },
      shoulder: { x: 502, y: 198 },
      elbow: { x: 516, y: 320 },
      hand: { x: 516 + 108 * Math.cos(a), y: 320 + 108 * Math.sin(a) },
      hip: { x: 485, y: 355 },
      knee: { x: 498, y: 455 },
      ankle: { x: 496, y: 566 },
    };
  }
  if (movement === "lunge")
    return {
      head: { x: 500, y: 112 + t * 83 },
      shoulder: { x: 500, y: 198 + t * 83 },
      elbow: { x: 562, y: 260 + t * 55 },
      hand: { x: 574, y: 204 + t * 70 },
      hip: { x: 477, y: 350 + t * 72 },
      knee: { x: 525 + t * 93, y: 458 + t * 8 },
      ankle: { x: 514 + t * 112, y: 566 },
    };
  return {
    head: { x: 505 + t * 50, y: 112 + t * 156 },
    shoulder: { x: 500 + t * 35, y: 198 + t * 145 },
    elbow: { x: 557 + t * 55, y: 272 + t * 38 },
    hand: { x: 586 + t * 80, y: 218 + t * 80 },
    hip: { x: 477 - t * 75, y: 350 + t * 83 },
    knee: { x: 502 + t * 78, y: 455 + t * 15 },
    ankle: { x: 496, y: 566 },
  };
}

const xy = (p: Point) => `${p.x},${p.y}`;
function Figure({
  pose: p,
  ghost = false,
  movement,
}: {
  pose: Pose;
  ghost?: boolean;
  movement: Movement;
}) {
  const rearKnee =
    movement === "lunge"
      ? { x: p.hip.x - 65, y: 515 }
      : { x: p.knee.x - 48, y: p.knee.y - 8 };
  const rearAnkle =
    movement === "lunge"
      ? { x: 320, y: 566 }
      : { x: p.ankle.x - 53, y: p.ankle.y - 8 };
  if (ghost)
    return (
      <g
        className="study-ghost"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx={p.head.x} cy={p.head.y} r="27" />
        <path
          d={`M${xy(p.head)} L${xy(p.shoulder)} L${xy(p.hip)} L${xy(p.knee)} L${xy(p.ankle)} M${xy(p.shoulder)} L${xy(p.elbow)} L${xy(p.hand)}`}
        />
      </g>
    );
  return (
    <g className="study-figure" strokeLinecap="round" strokeLinejoin="round">
      <path
        d={`M${xy(p.hip)} L${xy(rearKnee)} L${xy(rearAnkle)}`}
        fill="none"
        stroke="var(--study-rear)"
        strokeWidth="38"
      />
      <path
        d={`M${p.shoulder.x - 16},${p.shoulder.y} Q${p.hip.x - 30},${p.hip.y - 32} ${p.hip.x - 21},${p.hip.y + 8} Q${p.hip.x + 3},${p.hip.y + 27} ${p.hip.x + 28},${p.hip.y + 6} L${p.shoulder.x + 31},${p.shoulder.y + 9} Q${p.shoulder.x + 14},${p.shoulder.y - 20} ${p.shoulder.x - 16},${p.shoulder.y}`}
        fill="var(--study-body)"
      />
      <path
        d={`M${xy(p.shoulder)} L${p.head.x - 7},${p.head.y + 23}`}
        stroke="var(--study-body)"
        strokeWidth="27"
      />
      <path
        d={`M${xy(p.hip)} L${xy(p.knee)} L${xy(p.ankle)}`}
        fill="none"
        stroke="var(--study-body)"
        strokeWidth="44"
      />
      <path
        d={`M${xy(p.shoulder)} L${xy(p.elbow)} L${xy(p.hand)}`}
        fill="none"
        stroke="var(--study-body)"
        strokeWidth="28"
      />
      <path
        d={`M${p.ankle.x - 8},${p.ankle.y + 5} Q${p.ankle.x + 20},${p.ankle.y + 12} ${p.ankle.x + 48},${p.ankle.y + 11}`}
        stroke="var(--study-body)"
        strokeWidth="22"
      />
      <path
        d={`M${rearAnkle.x - 8},${rearAnkle.y + 5}h49`}
        stroke="var(--study-rear)"
        strokeWidth="20"
      />
      <path
        d={`M${p.head.x - 25},${p.head.y - 5} Q${p.head.x - 33},${p.head.y - 32} ${p.head.x - 4},${p.head.y - 37} Q${p.head.x + 26},${p.head.y - 40} ${p.head.x + 29},${p.head.y - 12} L${p.head.x + 36},${p.head.y + 2} L${p.head.x + 27},${p.head.y + 7} Q${p.head.x + 24},${p.head.y + 35} ${p.head.x + 5},${p.head.y + 30} Q${p.head.x - 23},${p.head.y + 21} ${p.head.x - 25},${p.head.y - 5}`}
        fill="var(--study-body)"
      />
      <path
        d={`M${xy(p.shoulder)} L${xy(p.hip)} L${xy(p.knee)} L${xy(p.ankle)} M${xy(p.shoulder)} L${xy(p.elbow)} L${xy(p.hand)}`}
        stroke="var(--study-line)"
        strokeWidth="1.5"
        fill="none"
      />
      {[p.shoulder, p.elbow, p.hip, p.knee, p.ankle].map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={i === 3 ? 8 : 5}
          fill="var(--study-body)"
          stroke="var(--study-line)"
          strokeWidth="1.5"
        />
      ))}
    </g>
  );
}

export function MovementStudy() {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const [movement, setMovement] = useState<Movement>("squat");
  const [progress, setProgress] = useState(65);
  const [playing, setPlaying] = useState(false);
  const active = movements.find((item) => item.id === movement)!;
  const pose = position(movement, progress);
  const jointAngle = Math.round(
    movement === "curl"
      ? angle(pose.shoulder, pose.elbow, pose.hand)
      : angle(pose.hip, pose.knee, pose.ankle),
  );

  useEffect(() => {
    if (!playing || reducedMotion) return;
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      setProgress(Math.round((1 - Math.cos((now - start) / 1300)) * 50));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, reducedMotion]);

  return (
    <div
      className="movement-study"
      aria-label="Interactive movement illustration"
    >
      <div className="study-side-note">
        <span className="study-number">
          0{movements.findIndex((item) => item.id === movement) + 1} / 03
        </span>
        <p>
          Small adjustments.
          <br />
          Lasting progress.
        </p>
      </div>
      <svg
        className="study-canvas"
        viewBox="180 40 650 565"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
      >
        <title id={`${id}-title`}>{`${active.name} movement study`}</title>
        <desc id={`${id}-desc`}>
          An illustrated side view using synthetic landmarks. Use the movement
          buttons and position slider to explore joint angles. This is not a
          form assessment.
        </desc>
        <path
          d="M270 586 Q500 580 740 586"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity=".2"
        />
        {[0, 35, 100].map((value) => (
          <Figure
            key={value}
            pose={position(movement, value)}
            ghost
            movement={movement}
          />
        ))}
        <Figure pose={pose} movement={movement} />
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity=".5"
        >
          <path d={`M${pose.knee.x + 32},${pose.knee.y}q32 -2 46 -35`} />
          <path d={`m${pose.knee.x + 78},${pose.knee.y - 35}-1 12m1-12-12 2`} />
        </g>
      </svg>
      <div className="study-measure">
        <span>{active.joint} angle</span>
        <strong aria-live="off">
          {jointAngle}
          <small>°</small>
        </strong>
        <p>
          Illustrated position
          <br />
          Not a form assessment
        </p>
      </div>
      <div className="study-controls">
        <div className="movement-options" aria-label="Choose a movement">
          {movements.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={movement === item.id}
              onClick={() => {
                setMovement(item.id);
                setPlaying(false);
              }}
            >
              <span>0{index + 1}</span>
              {item.name}
            </button>
          ))}
        </div>
        <div className="study-scrubber">
          <label htmlFor={`${id}-position`}>Explore the movement</label>
          <input
            id={`${id}-position`}
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(event) => {
              setPlaying(false);
              setProgress(Number(event.target.value));
            }}
            aria-valuetext={`${progress}% through the illustration`}
          />
          {!reducedMotion && (
            <button
              type="button"
              aria-pressed={playing}
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? "Pause" : "Play"}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
              >
                {playing ? (
                  <path d="M3 3h3v10H3zm7 0h3v10h-3z" />
                ) : (
                  <path d="m5 2 9 6-9 6z" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>
      <p className="study-caption">
        {active.note} <span>Synthetic movement demonstration.</span>
      </p>
    </div>
  );
}
