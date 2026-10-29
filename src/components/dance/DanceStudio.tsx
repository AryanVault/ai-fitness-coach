"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PoseAnalyzer from "@/components/PoseAnalyzer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requestJson } from "@/lib/client/request";
import { buildReferenceSkeleton } from "@/lib/dance/training-engine";
import type { DanceRoutinePack } from "@/lib/dance/types";
import type { DanceCourseState } from "@/lib/dance/course-rules";

type CourseResponse = { routine: DanceRoutinePack; course: DanceCourseState; demo?: boolean };

export default function DanceStudio() {
  const [data, setData] = useState<CourseResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(false);
    try {
      const result = await requestJson<CourseResponse>("/api/dance/course", { credentials: "include", cache: "no-store", signal });
      if (!signal?.aborted) setData(result);
    } catch { if (!signal?.aborted) setError(true); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const saved = () => { void load(controller.signal); };
    window.addEventListener("fitcoach:session-saved", saved);
    return () => { controller.abort(); window.removeEventListener("fitcoach:session-saved", saved); };
  }, [load]);
  const routine = data?.routine;
  const segment = routine?.segments[activeStep] ?? routine?.segments[0];
  const step = routine?.tutorial?.find(item => item.segmentId === segment?.id);
  const skeleton = useMemo(() => segment ? buildReferenceSkeleton(segment) : null, [segment]);
  const progress = data?.course.lessons.find(item => item.segmentId === segment?.id);
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold sm:text-4xl">Dance studio</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Learn a shape, hear the count, then practice with movement feedback.</p>
        </div>
        {routine ? <p className="text-sm text-muted-foreground">{routine.bpm} BPM · {Math.round(routine.durationMs / 1000)} second loop</p> : null}
      </header>
      {error ? <div role="alert" className="flex flex-wrap items-center gap-4 rounded-xl bg-secondary p-5"><p>Dance course could not load.</p><Button variant="secondary" onClick={() => void load()}>Retry dance course</Button></div> : null}
      {loading && !data ? <p role="status">Loading your dance course...</p> : null}
      {data && segment ? (
        <Card className="bg-card shadow-none">
          <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(220px,.65fr)] lg:gap-10">
            <div className="space-y-5">
              <h2 className="text-xl font-semibold">{routine?.name}</h2>
              <div className="space-y-2">
                <label htmlFor="dance-phrase" className="block text-sm font-medium">Study a phrase</label>
                <select id="dance-phrase" value={activeStep} onChange={event => setActiveStep(Number(event.target.value))} className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {routine?.segments.map((item, i) => <option key={item.id} value={i}>{i + 1}. {item.label}</option>)}
                </select>
              </div>
              <p className="text-base leading-7">{segment.cue}</p>
              {step ? <p className="text-sm leading-6 text-muted-foreground">{step.practiceCue} {step.correction}</p> : null}
              <p className="text-sm text-muted-foreground">{Math.round(segment.startMs / 1000)} to {Math.round(segment.endMs / 1000)} seconds. This is an authored pose checkpoint, not a recorded expert performance.</p>
              <Button onClick={() => document.getElementById("live-dance-coach")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" })}>Practice with camera</Button>
              <div className="space-y-2 text-sm">
                <p>{data.demo ? "Demo course history" : "Saved course progress"}: {data.course.completedLessons} of {data.course.totalLessons} phrases complete.</p>
                <p className="text-muted-foreground">{progress?.attempts ? `${progress.attempts} saved attempts for this phrase. Best visible shape score ${progress.bestScore}.` : "No saved attempt for this phrase yet."}</p>
                <p className="text-muted-foreground">Camera sessions supply scores. Selecting a phrase does not record progress.</p>
              </div>
            </div>
            {skeleton ? <figure className="flex min-w-0 flex-col justify-center rounded-xl bg-secondary px-6 py-4">
              <svg viewBox="0 0 100 100" role="img" aria-label={`${segment.label} pose checkpoint`} className="mx-auto max-h-64 w-full max-w-64 text-primary">
                {skeleton.connections.map(([a,b]) => <line key={`${a}-${b}`} x1={skeleton.points[a].x} y1={skeleton.points[a].y} x2={skeleton.points[b].x} y2={skeleton.points[b].y} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />)}
                {Object.entries(skeleton.points).map(([name,point]) => <circle key={name} cx={point.x} cy={point.y} r={name.includes("Wrist") ? 2.3 : 1.6} fill="currentColor" />)}
              </svg>
              <figcaption className="mt-3 text-center text-sm text-muted-foreground">{segment.label}: {segment.focus}</figcaption>
            </figure> : null}
          </CardContent>
        </Card>
      ) : null}
      <section id="live-dance-coach" className="scroll-mt-6" aria-label="Live dance coach">
        <PoseAnalyzer mode="dance" />
      </section>
    </div>
  );
}
