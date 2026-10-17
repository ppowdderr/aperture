Scraped/exported JSON lives here and is committed, so the app runs with no network and no Mongo.

- `programme-<CODE>.json` — `ProgrammeYear[]` from DRPS (scripts/scrape-drps.ts)
- `courses-<CODE>.json`   — `Course[]` for every course referenced by that programme
- `slots-<CODE>.json`     — `Slot[]` exported from the Course Timetable Browser (scripts/export-timetable.ts, needs EASE)

Never commit exports containing personal fields (names, matriculation numbers).
