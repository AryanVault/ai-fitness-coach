# AI Fitness Coach

A web app that uses your laptop or phone camera to coach exercise and dance in real time. It tracks your body in the browser, counts reps, scores your form, corrects posture as you move, and turns each session into a report you can review later. Workout plans, nutrition, recovery and progress tracking sit around the live coach.

Pose tracking runs entirely on-device, so camera video never leaves your browser.

## Features

**Live workout coach**
- Real-time body tracking with MediaPipe Pose and MoveNet (TensorFlow.js), running in a Web Worker so the UI stays smooth
- Rep counting that works at any distance from the camera, with calibration, landmark smoothing and low-confidence guards
- Form scorecards for squats, pushups, lunges, planks and curls, with spoken and on-screen cues
- Safety checks that flag risky joint angles and stop scoring when the body isn't clearly visible
- Recovery after camera interruptions: the session is kept if the camera drops or the tab is backgrounded

**Dance studio**
- Step-by-step dance courses with tutorials and levels
- Timing scored against the audio clock, so feedback lines up with the beat
- Per-step scoring and course progression

**Movement games**
- Camera-controlled games (curl bubbles, pushup levels, cardio reach) mapped to your body's position

**Review Lab**
- Replay any session on a scrubbable timeline with skeleton overlay
- Evidence reports that show what was measured, how confident the tracker was and why each score was given
- A methodology page explaining how scores are calculated

**Planning and tracking**
- Onboarding profile, generated workout plans and a searchable movement catalog
- Nutrition logging, daily readiness and recovery check-ins
- Progress charts, streaks and achievements
- An AI coach (chat, session debriefs, next-workout suggestions) backed by OpenAI or Groq, with a daily token budget

## Tech stack

| Area | Tools |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Radix UI, Motion |
| Computer vision | MediaPipe Tasks Vision, TensorFlow.js MoveNet, Web Workers, Three.js 3D skeleton HUD |
| Data | PostgreSQL, Drizzle ORM and migrations |
| Auth | Clerk (Better Auth for legacy accounts) |
| AI | OpenAI / Groq |
| Infra | Vercel, Neon, Upstash Redis rate limiting, Docker |
| Testing | Vitest, Playwright, Python `unittest` for the posture-model pipeline, GitHub Actions CI |

## Project structure

```
src/app/          Pages and API routes (coach, dashboard, review-lab, nutrition, ...)
src/components/   UI, including PoseAnalyzer (the live camera coach)
src/lib/pose/     Tracking engine, rep counting, scorecards, calibration, safety, replay
src/lib/server/   Coach agent, dance courses, workout persistence
src/db/           Drizzle schema and seed data
drizzle/          SQL migrations
scripts/          Model data prep, training, benchmarks, backups
tests/            End-to-end, integration and ML pipeline tests
docs/             Design notes, validation reports and runbooks
```

## Getting started

Requirements: Node 22 (`nvm use`), npm 10, Python 3.12+ and PostgreSQL.

```sh
cp .env.example .env.local      # set DATABASE_URL and an auth secret
npm ci --legacy-peer-deps
export DATABASE_URL=...         # the Drizzle CLI does not read .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000 and allow camera access.

Or run everything in Docker:

```sh
docker compose up --build
```

This starts PostgreSQL, applies migrations, seeds the movement catalog and runs the app.

### Environment

See `.env.example` for every option. Required locally: `DATABASE_URL` plus an auth secret. Optional: `OPENAI_API_KEY` or `GROQ_API_KEY` for the AI coach, Clerk keys for hosted auth, Upstash keys for rate limiting. Set `ENABLE_DEMO_MODE=true` and `NEXT_PUBLIC_ENABLE_DEMO_MODE=true` to try the app with a one-click demo account.

## Testing

```sh
npm run lint
npm run typecheck
npm test                    # unit tests
npm run test:ml             # posture-model pipeline
npm run test:integration    # needs TEST_DATABASE_URL pointing at a database named *test*
npx playwright install chromium
npm run test:e2e            # browser tests
npm run build
```

## Docs

- [Camera engine validation](docs/camera-engine-validation-2026-10-29.md)
- [Movement games](docs/tracking-games-validation-2026-10-29.md)
- [Posture model pipeline](docs/posture-model-pipeline.md)
- [Hip-hop training engine](docs/hip-hop-training-engine.md)
- [Production runbook](docs/production-beta-runbook.md)
- [Authentication setup](docs/authentication-setup.md)
