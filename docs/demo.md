# Aperture demo freeze

This is the 3-minute rehearsal script for the EdinburghAI “Flip the Script” demo. The product path is:

1. describe a week in chat,
2. see the constraints become visible, removable settings,
3. get legal years that re-solve immediately,
4. show the source-backed degree-rule extraction.

## Frozen data

Do not edit the committed demo data on the day.

```text
c90ee1f4d9652a0204b4ab309a99c6cbcfe786a9ca7c9ed8ad8d518fb8600d0f  data/courses-UTCMPSI.json
41957ca7b6bd2c9023fe2bb32c692f3add90a0a4fbaaf94572b6c8cd53f77f1d  data/programme-UTCMPSI.json
c6da63f609681640143cbf298c98c76c9ead972b186189aa4e2d5bbed3cad6ec  data/slots-UTCMPSI.json
```

Check with:

```bash
shasum -a 256 data/*-UTCMPSI.json
```

## Pre-demo checklist

- [ ] `nvm use 22.22.2`
- [ ] `npm install`
- [ ] Put the LLM settings in the shell or `.env.local`. Local demo:
  - `LLM_BASE_URL=http://127.0.0.1:11434/v1`
  - `LLM_MODEL=qwen2.5:7b`
  - `LLM_API_KEY=` (empty)
- [ ] Hosted fallback:
  - `LLM_BASE_URL=https://api.deepseek.com`
  - `LLM_MODEL=deepseek-flash`
  - `LLM_API_KEY=<the DeepSeek key>`
- [ ] Start Ollama and verify the model: `ollama list` includes `qwen2.5:7b`.
- [ ] Mongo is optional. For the fastest demo path leave `MONGODB_URI` unset so the APIs read the frozen JSON immediately.
- [ ] Start the app: `npm run dev`.
- [ ] Open `/plan`, clear this site’s local storage, reload, and confirm Year 3 with the earlier compulsory courses passed.
- [ ] Browser zoom is 100%; DevTools and notifications are closed.
- [ ] Run `npm run lint && npm run typecheck && npm test` before going on stage.
- [ ] Keep `docs/demo.mp4` open in a second window as the offline fallback.

## Exact demo sentence

Type or paste:

```text
no 9ams, Fridays free, KB days together, I want to do databases and something in ML.
```

Expected visible settings:

- Friday `all day free`
- `Not before 10:00`
- `One campus per day`
- keywords `databases` and `machine learning`
- no accidental course pins

The model may phrase its reply differently, but those five settings must match.

## Expected solutions

With Year 3, the normal prior-year compulsory courses passed, and only the demo sentence applied, the deterministic solver returns these course sets:

1. `INFR09032, INFR09051, INFR10022, INFR10059, INFR10065, INFR10067, INFR10090`
2. `INFR09032, INFR09051, INFR10022, INFR10059, INFR10067, INFR10079, INFR10086`
3. `INFR09032, INFR09051, INFR10022, INFR10057, INFR10065, INFR10067, INFR10079`

Plan 1 has score `0` because its only misses are forced by compulsory lectures. This is the honest demo moment: the published timetable already puts compulsory teaching on Friday and before 10:00, so the app labels those as forced instead of pretending the request can be met.

Expected rule-extraction result after switching the degree sheet to Year 1:

- pass `INFR07003` before Year 2
- pass `INFR08035` before Year 2
- conditional `INFR07004`
- conditional `MATH07005` (CAFI)

Every card must show the exact DRPS sentence that supports it.

## 3-minute script

### 0:00–0:20 — the problem

“Course choice today works backwards. You pick courses, then discover the timetable, then repeat until it is bearable. Aperture flips it: describe the week you want, and it returns course sets your degree programme actually allows.”

Keep the planner on screen. Do not tour the landing page.

### 0:20–0:50 — describe the week

Type the exact sentence above. Let the send button finish.

Point at the chips first, then the Wednesday/Friday cells and the `Not before 10:00` control. Say:

“The sentence became settings, not a hidden chat instruction. I can remove or correct every one of them.”

### 0:50–1:25 — legal years and forced misses

Point at the three plan tabs and the solver time.

“These are legal years, not a shortlist. Compulsory courses and option-group credit ranges are checked before the timetable is scored.”

Point at the forced Friday/early misses:

“It also refuses to hide an impossible request. These misses come from compulsory published teaching, so no plan in this year can remove them.”

### 1:25–1:55 — manual correction

Open **Settings**. Show the Wednesday/Friday day-off controls, `No classes before`, and the applied-setting chips. Toggle one non-compulsory day and point at the immediately refreshed grids/plan caption.

Say:

“The grid is the truth. Chat writes these settings; I can change them by hand and the plan re-solves immediately.”

### 1:55–2:20 — source-backed degree rules

Open **Edit**. Switch to Year 1 and press **Read rules from notes**.

Point at the two must-pass rules and the CAFI conditional, then at the verbatim source sentences.

“The model is doing real work here: turning DPT prose into typed rules. Nothing is applied until I confirm it, and every rule points back to the exact source.”

Reject one optional rule and confirm the rest.

### 2:20–2:40 — close the loop

Switch back to Year 3 and close the sheet.

“Every plan links its rules back to DRPS. Tutorial groups are allocation requests because the university allocates them; the legal-year check and timetable constraints are deterministic.”

### 2:40–3:00 — close

“The flip: stop fitting your life around the timetable. Describe the week you want, and make the timetable prove it is legal.”

Stop talking. Leave the three plans visible.

## Failure recovery

- **Chat parser unavailable:** switch the shell to hosted DeepSeek, restart `npm run dev`, and use the exact sentence again.
- **Ollama missing or slow:** use the hosted DeepSeek settings above. Do not wait on a model download on stage.
- **Rule extraction fails:** the source library still demonstrates deterministic rules. Say so explicitly and continue; do not invent a successful parse.
- **Mongo is unreachable:** unset `MONGODB_URI` and restart. The committed JSON path is the demo path.
- **Any UI regression:** play `docs/demo.mp4` and narrate the same four beats.

## Rehearsal log

Record both developers here before closing the ticket.

| Run | Developer | Date/time | Duration | Exact sentence | 3 plans | Forced misses shown | Rule extraction |
|---|---|---|---|---|---|---|---|
| 1 | Lewis + Codex | 17 Oct 2026, 15:48 BST | 60 s page capture | exact | 3 | 6 on plan 1 | 4 confirmed |
| 2 | Abdullah | pending | pending | pending | pending | pending | pending |

The page-only fallback uses the exact sentence, settings, three plan tabs,
source-backed rule extraction, and confirmation. It is 60 seconds at 2 fps
because the macOS desktop capture exposed unrelated windows.
