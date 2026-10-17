# Windows / UU Remote setup

This checkout is configured for ongoing development on the Windows PC:

- Repository: `C:\Users\Lewis\projects\aperture`
- Runtime: Node.js 24 LTS (`24.22.0`) with npm `11.19.1`
- Install dependencies from the lockfile with `npm ci`
- Start the development server with `npm run dev`
- Local URL: `http://localhost:3000`
- Health endpoint: `http://localhost:3000/api/health`

The Node and GitHub CLI installs are on the user PATH. Restart an already-running terminal or Codex
session once if it still resolves the old system Node 20 runtime.

`MONGODB_URI` lives in the git-ignored `.env.local` file. It is intentionally blank until an Atlas
connection string is supplied.

The Balanced power plan is configured not to sleep or hibernate while on AC power. Display timeout and
screen locking are unchanged.

## Ticket #6 prerequisite

Timetable scraping requires Chrome to be signed in on the machine performing the scrape. Sign in to
Chrome on this Windows PC before starting ticket #6; the Mac Chrome session does not carry over.
