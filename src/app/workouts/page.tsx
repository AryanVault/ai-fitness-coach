"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/lib/client/request";
import type { ExerciseId } from "@/lib/pose/types";

type CatalogExercise = {
  id: string;
  name: string;
  category?: string;
  difficulty?: string;
  description?: string;
  instructions?: string;
  muscleGroup?: string;
  equipment?: string;
};

type Movement = {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  details: string[];
  href: string;
  action: string;
};

// Canonical IDs are the workout choices exposed by PoseAnalyzer. Catalog IDs
// are database keys; never pass those through as if they were analyzer choices.
const supportedNames: Record<string, Exclude<ExerciseId, "dance_basic">> = {
  squat: "squat", squats: "squat", bodyweight_squat: "squat", bodyweight_squats: "squat",
  pushup: "pushup", pushups: "pushup", push_up: "pushup", push_ups: "pushup",
  lunge: "lunge", lunges: "lunge", bicep_curl: "bicep_curl", bicep_curls: "bicep_curl",
  biceps_curl: "bicep_curl", biceps_curls: "bicep_curl",
  jumping_jack: "jumping_jack", jumping_jacks: "jumping_jack",
  plank: "plank", forearm_plank: "plank", warrior: "warrior", warrior_ii: "warrior", warrior_2: "warrior",
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function readable(value: string) {
  return value.replace(/[_-]+/g, " ");
}

function toMovement(exercise: CatalogExercise): Movement | null {
  const id = normalize(exercise.id);
  const name = normalize(exercise.name);
  const canonicalId = Object.hasOwn(supportedNames, id) ? supportedNames[id]
    : Object.hasOwn(supportedNames, name) ? supportedNames[name] : null;
  if (!canonicalId) return null;
  return {
    id: exercise.id,
    name: exercise.name,
    category: exercise.category?.trim().toLowerCase() || "other",
    difficulty: exercise.difficulty ? readable(exercise.difficulty) : "Level not specified",
    description: exercise.description || exercise.instructions || "Choose this movement in the camera coach to review setup guidance.",
    details: [exercise.muscleGroup, exercise.equipment].filter((value): value is string => Boolean(value)).map(readable),
    href: `/coach/workout?exercise=${canonicalId}`,
    action: `Practice ${exercise.name}`,
  };
}

// This course is the bundled starter-groove-pack used by DanceStudio. Other
// catalog dance styles do not have corresponding training routines yet.
const starterCourse: Movement = {
  id: "starter-groove-pack",
  name: "Hip-Hop Starter Groove",
  category: "dance",
  difficulty: "beginner",
  description: "Practice the starter course: wide arm hits, soft-knee groove, torso control and phrase timing.",
  details: ["Guided starter course"],
  href: "/coach/dance",
  action: "Open Hip-Hop Starter Groove",
};

export default function WorkoutsPage() {
  const [exercises, setExercises] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await requestJson<{ exercises: CatalogExercise[] }>("/api/exercises", {
          credentials: "include", cache: "no-store", signal: controller.signal,
        });
        if (!Array.isArray(data?.exercises)) throw new Error("Invalid movement catalog");
        const movements = data.exercises.filter(exercise =>
          exercise && typeof exercise.id === "string" && typeof exercise.name === "string",
        ).map(toMovement).filter((movement): movement is Movement => movement !== null);
        if (!cancelled) setExercises(movements);
      } catch {
        if (!cancelled) setError("Could not load the movement catalog. Retry to see available camera exercises.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [attempt]);

  const movements = [...exercises, starterCourse];
  const categories = Array.from(new Set(movements.map(movement => movement.category))).sort();
  const search = query.trim().toLowerCase();
  const filtered = movements.filter(movement =>
    (category === "all" || movement.category === category) &&
    [movement.name, movement.category, movement.description, ...movement.details].some(value => value.toLowerCase().includes(search)),
  );
  const hasFilters = category !== "all" || query.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-6 lg:p-8">
      <header className="space-y-4">
        <h1 className="text-4xl leading-tight md:text-5xl">Movement library</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Choose a camera-supported movement or the hip-hop starter course. Each session begins with setup and calibration.
        </p>
        <Link href="/coach/chat" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-foreground hover:text-primary">
          Ask your coach for guidance <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section aria-label="Find a movement" className="grid items-end gap-4 rounded-xl bg-card p-5 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.45fr)_auto] md:p-6">
        <div className="space-y-2">
          <Label htmlFor="movement-search">Search movements</Label>
          <Input id="movement-search" type="search" value={query} placeholder="Name, muscle group or technique" onChange={event => setQuery(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="movement-category">Movement category</Label>
          <select id="movement-category" value={category} onChange={event => setCategory(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <option value="all">All movements</option>
            {categories.map(value => <option key={value} value={value}>{readable(value).replace(/^./, letter => letter.toUpperCase())}</option>)}
          </select>
        </div>
        <Button variant="ghost" disabled={!hasFilters} onClick={() => { setQuery(""); setCategory("all"); }}>Clear filters</Button>
      </section>

      {loading ? <p role="status" className="text-sm text-muted-foreground">Loading movement catalog...</p> : error ? (
        <div role="alert" className="space-y-3 rounded-xl bg-muted p-5">
          <p className="text-sm">{error}</p>
          <Button onClick={() => setAttempt(value => value + 1)}>Retry catalog</Button>
        </div>
      ) : (
        <section aria-label="Available movements" className="space-y-4">
          <p role="status" className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "movement" : "movements"} available</p>
          {filtered.length ? (
            <ul className="space-y-3">
              {filtered.map(movement => (
                <li key={movement.id} className="grid items-center gap-5 rounded-xl bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] md:p-6">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="capitalize">{readable(movement.category)}</span>
                      <span className="capitalize">{movement.difficulty}</span>
                    </div>
                    <h2 className="text-2xl leading-tight">{movement.name}</h2>
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{movement.description}</p>
                    {movement.details.length ? <p className="text-sm capitalize text-muted-foreground">{movement.details.join(" · ")}</p> : null}
                  </div>
                  <Button asChild variant="ghost" className="justify-start gap-3 sm:justify-center">
                    <Link href={movement.href} aria-label={movement.action}>{movement.href === "/coach/dance" ? "Open course" : "Practice"}<span aria-hidden="true">↗</span></Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : <p className="py-8 text-sm text-muted-foreground">No movements match these filters.</p>}
        </section>
      )}
    </div>
  );
}
