# Aperture

**Describe the week you want; get back the legal course choices that produce it.**

Today you pick courses, then discover the week they produce, then repeat. Aperture flips it: you paint the
week you want (no 9 ams, Fridays free, King's Buildings days together), and a solver returns course sets that
produce that week **and** satisfy your Degree Programme Table. Every rule it enforces links back to the DRPS
line it came from.

Built at the EdinburghAI "Flip the Script" hackathon. Design: [`docs/outline.md`](docs/outline.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind 4 · MongoDB + Mongoose 9 · Vitest · zod.
Solver is plain TypeScript (branch-and-bound over ~60 courses; no Python/OR-Tools dependency).
LLM layer talks to Ollama locally or any OpenAI-compatible endpoint.

## Run

```bash
cp .env.example .env.local      # set MONGODB_URI (local mongod or Atlas)
npm install
npm run dev                     # http://localhost:3000
```

Checks (CI runs the same): `npm run lint && npm run typecheck && npm test && npm run build`.

## Layout

```
src/app/              pages + API routes (route.ts under src/app/api/*)
src/components/       WeekGrid, DegreePanel, Results, RulesLedger ...
src/lib/types.ts      shared domain types — change via PR, everyone depends on these
src/lib/db/           mongoose connection + models
src/lib/solver/       constraint model, search, scoring, explanations
src/lib/llm/          model adapter, prose-rule extractor, preference parser
scripts/              DRPS scraper, timetable export (needs EASE login), seed
data/                 scraped JSON checked in so the app runs without scraping
docs/                 outline, decisions
```

## Working on it

Two developers, both using AI agents, shipping to `main`. Read [`AGENTS.md`](AGENTS.md) before picking up a ticket.
