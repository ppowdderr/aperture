# Working agreement (humans and agents)

Two developers, each pairing with an AI agent, shipping fast to `main`. Tickets are GitHub issues grouped in
milestones M0–M4. Each ticket names the **files it owns**; do not edit files owned by an open ticket you are not
holding. If you must, comment on that ticket first.

## Picking up a ticket

1. Pick the lowest-numbered open issue in the current milestone that is assigned to you (or unassigned) and
   whose "Depends on" issues are closed. Assign yourself. Comment "picking up".
2. `git checkout main && git pull && git checkout -b t<issue>-<slug>` (e.g. `t7-solver-hard-constraints`).
3. Read the ticket's **Scope**, **Files**, **Acceptance** sections. The acceptance list is the definition of done;
   nothing more.

## Building

- Shared types live in `src/lib/types.ts`. If your ticket needs a type change, make it minimal and mention it in the PR.
- Keep the UI dark, minimal, one page. No new UI libraries without a ticket.
- No `any`. Validate every API input with zod. Server code never trusts the client.
- Data files under `data/` are checked in so the app runs with no scraping and no Mongo for the demo path.
- Secrets only in `.env.local` (git-ignored). Add every new variable to `.env.example` with a comment.

## Testing

- `npm run lint && npm run typecheck && npm test` must pass locally before pushing. CI runs the same plus `npm run build`.
- Pure logic (solver, parsers, scrapers' HTML→JSON) gets a Vitest unit test in the same folder (`*.test.ts`).
- UI tickets: include a screenshot in the PR.

## Pushing back to main

1. Commit small; message starts with the ticket: `t7: hard constraints + legal-year CLI`.
2. Push, open a PR titled `t7: ...`, body: what changed, how you tested, `Closes #7`.
3. Green CI → squash-merge yourself. Don't wait for review unless the ticket says `needs-review`.
4. Delete the branch. Comment on the next ticket you are taking.

## Conventions

- Dates/times: slots are `{ day: 0-4, start: minutes since 00:00, end: minutes, weeks: number[] }`.
- Course codes: upper-case DRPS code, e.g. `INFR09051`. Semesters: `1 | 2 | "full"`.
- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for components.
- Never commit `.env.local`, exported timetable data with personal fields, or `node_modules`.
