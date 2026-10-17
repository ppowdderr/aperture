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

Windows/UU Remote setup notes, including the ticket #6 Chrome prerequisite, are in
[`docs/windows-setup.md`](docs/windows-setup.md).

## Deploy

The public deployment runs at <https://aperture-one-ruby.vercel.app> on Vercel Hobby.

Configure these environment variables in the Vercel project:

- `LLM_BASE_URL=https://api.deepseek.com`
- `LLM_MODEL=deepseek-flash`
- `LLM_API_KEY` — server-side secret only; never commit it
- `MONGODB_URI` — optional. The production project is connected to the seeded Atlas database;
  every read route also falls back to the checked-in `data/*.json` files when Mongo is unavailable.

For local development, put the same values in the git-ignored `.env.local`. Atlas is not required for
the demo deployment.

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
