# Week-first timetabling — outline for discussion

Working name: **Inverse** (pick something better later). One line: *Describe the week you want; get back the legal course choices that produce it.*

## 1. The flip, stated precisely

| Today (Course Timetable Browser, Path, DRPS) | Inverse |
|---|---|
| Pick courses → see the week they make → repeat until bearable | Describe the week → see the course sets that make it |
| You check the degree rules by hand against the DPT | The solver only returns years that satisfy the DPT |
| Clashes discovered after choosing | Clash-free by construction |
| Tutorial group is whatever you were given | Output says which groups to request and why |

The claim to make on stage: *course choice is a constraint-satisfaction problem that the university currently asks 40,000 students to solve by trial and error, once a year, badly.*

## 2. What the user sees (one page, dark, no tabs)

Left column — **your week**: a Mon–Fri grid 09–18. You paint cells: red = never, amber = avoid, green = prefer. Three toggles underneath: *max back-to-back hours*, *max gap*, *campus days together* (KB vs Central).
Under it, a single text box: *"no 9ams, Fridays off, keep KB days together, I want to do databases"* → the parser fills the grid and the toggles; you can correct them. The text box is sugar; the grid is the truth.

Top — **your degree**: programme + year (from DRPS), already-passed courses (tick list), credits so far.

Right column — **results**: up to 3 candidate years. Each shows: course list with credits per semester, the week grid for S1 and S2 side by side, a score (how well it matches your painted week), and *why* lines ("INFR09051 forced: compulsory", "MATH08057 chosen over MATH08058: 2 fewer early starts"). A "lock this course" pin regenerates alternatives around it.

Bottom — **ledger of rules**: the DPT rules the solution satisfies, in plain English, each linking to the DRPS line it came from. This is the credibility piece: a judge can click and see the source.

## 3. Data

| Need | Source | Access | Status |
|---|---|---|---|
| Degree programme tables (compulsory, option groups, credit ranges, notes) | `drps.ed.ac.uk/25-26/dpt/ut*.htm` | public HTML | verified: BSc CS table parses, 61 courses linked |
| Course facts: semester, credits, level, prerequisites text, assessment | `drps.ed.ac.uk/25-26/dpt/cx*.htm` | public HTML | verified fields present |
| Timetable slots per course (activity type, day, start, end, weeks, room, group) | Course Timetable Browser `browser.ted.is.ed.ac.uk` | EASE login | **you must pull it**; one scripted session with your login, saved as JSON |
| Campus for rooms | room code prefix (e.g. AT = Appleton Tower, JCMB = KB) | derived | trivial table |

Scope for the demo dataset: one programme (yours), years 2–4, ~60–80 courses. Do not try to cover the university.

## 4. The model (CP-SAT, OR-Tools)

Variables: `take[c] ∈ {0,1}` per course; `grp[c,a] ∈ groups` per course activity with alternative groups (tutorials/labs).

Hard constraints (from DPT + catalogue):
- compulsory courses: `take = 1`
- option groups: `lo ≤ Σ credits·take ≤ hi` per group (DPT states these literally: "select exactly 60 credits")
- year total = 120 credits; per-semester balance 40–80 (DRPS rule)
- prerequisites satisfied by passed courses; co-requisites taken together
- no two chosen activities overlap in the same semester+week
- "must be passed before progression" and similar notes → handled as flags, not constraints

Soft constraints (from the painted week), weighted objective:
- cell painted red containing a lecture → heavy penalty; amber → light; green → bonus
- early starts, late finishes, gaps > N, campus switches within a day, Friday load
- course preference words ("I want databases") → bonus on matching course titles/keywords

Output: solve for optimum, then re-solve with a "differ in ≥ 2 courses" cut twice → 3 diverse candidates. Expect solves in < 1 s at this size.

## 5. Where the LLM does real work (so this isn't "a solver with a chatbot")

1. **DPT prose → constraints.** The tables are mostly structured, but the notes aren't: *"CAFI is required for students with Higher Mathematics only, or Advanced Higher less than Grade A"*, *"students must pass INF1A and INF1B before Year 2"*. The LLM turns these into typed rules (`requires_if(background=…)`, `must_pass_before(year=2)`), each shown with its source sentence for the user to confirm. That is genuinely hard, genuinely useful, and visibly AI.
2. **Week sentence → grid + toggles.** Small, reliable with a schema-constrained output. Local model is fine.
3. **Explanations.** The "why" lines come from the solver (which constraints bound), the LLM only phrases them. Never let it invent reasons.

Not used for: choosing courses, checking rules, drawing timetables. Say this out loud; judges respect knowing where the model shouldn't be.

## 6. Build order (each step leaves something demoable)

1. DRPS scraper → `programme.json` (courses, groups, credits, prereqs text). *~2 h*
2. You: slot export from the timetable browser → `slots.json`. *~1–2 h incl. figuring out the browser's endpoints; I write the script, you run it logged in*
3. Solver with hard constraints only, CLI: "give me a legal year" → list. *~2 h*
4. Soft constraints from a hand-written grid; three diverse solutions. *~2 h*
5. UI: grid painting, results, week view. *~4 h*
6. LLM layer: notes → rules with confirm UI; sentence → grid. *~3 h*
7. Rules ledger with DRPS links, polish, rehearsal. *~2 h*

Demo exists after step 5. Total is about two long days; one if the slot export goes smoothly.

## 7. Demo script (3 minutes)

0:00 Show the real Course Timetable Browser for 15 seconds: add three courses, point at the clash. "This is how 40,000 people choose their year."
0:30 Inverse. Programme: BSc CS Year 3. Type: *"no 9ams, Fridays free, KB days together, I want to do databases and something in ML."* Grid fills itself.
1:00 Solve. Three valid years appear in under a second, week grids drawn, no clashes, Friday empty.
1:30 Click a rule in the ledger → DRPS page opens at the exact line. "Every one of these years is legal; here's the proof."
2:00 Paint Thursday afternoon red. Re-solve. Show what changed and the "why" lines.
2:30 Pin one course, show alternatives regenerate around it. Close: "The flip: you stop fitting your life around a timetable; the timetable is fitted around your week."

## 8. Honest risks and the answer to each

- *"It's a filter."* Answer: filters remove options from a list you chose; this chooses the list, subject to degree law. Show the rules ledger.
- *"Where's the AI?"* Answer: the DPT prose rules. Show one note being parsed live and the user confirming it.
- *Tutorial groups are allocated centrally.* Say it: output is a request list; the lectures (which don't move) are the main constraint anyway.
- *Slot export fails or takes too long.* Fallback: hand-enter slots for the 25 courses the demo touches; it's a day's worth of data, not a dataset.
- *Judges want a product, not a tool.* The natural next line is "the university runs this once over all students to allocate tutorial groups": same solver, flipped institution. Say it as a one-liner, don't build it.

## 9. Open questions for you

1. Your exact programme and year, so the first scrape is the right DPT.
2. Are you willing to spend ~1 h logged into the timetable browser running an export script? That's the only thing I can't do from here.
3. Local LLM (Ollama, offline, slower) or an API key for the parsing layer (faster, costs pennies)?
4. Team size and skills, so the build order can be split.
