import type { Caption } from "@remotion/captions";

export const VIDEO = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 2040,
  accent: "#9cc5ff",
  background: "#0e1318",
  surface: "#121920",
  surfaceRaised: "#18212a",
  line: "#3b4a59",
  text: "#f5f7fa",
  muted: "#b7c3cf",
  faint: "#91a0ae",
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

export const SCENES = {
  title: { from: 0, duration: 210 },
  flip: { from: 210, duration: 270 },
  pain: { from: 480, duration: 270 },
  product: { from: 750, duration: 660 },
  stack: { from: 1410, duration: 240 },
  limits: { from: 1650, duration: 210 },
  end: { from: 1860, duration: 180 },
} as const;

export const brand = {
  name: "Aperture",
  tagline: "Describe the week you want. Get back the legal course choices that produce it.",
  context: "Computer Science (BSc Hons) - 2026/27",
  kicker: "WEEK-FIRST DEGREE PLANNING",
  proof: "68 courses - 570 timetable slots - 135 legal Year 3 sets",
  chromeTagline: "WEEK IN. LEGAL YEAR OUT.",
  startLine: "START WITH THE WEEK",
} as const;

export const flip = {
  index: "01",
  oldLabel: "OLD ASSUMPTION",
  oldStatement: "Pick courses. Discover the week. Live with it.",
  oldNote: "Clashes usually arrive after the choice is made.",
  newLabel: "THE FLIP",
  newStatement: "Paint the week. Solve for a legal year.",
  newNote: "The week becomes the input. Degree law stays hard.",
  bridge: "The timetable becomes the prompt.",
  verb: "FLIP",
} as const;

export const pain = {
  index: "02",
  kicker: "THE PAIN",
  heading: "A clash you only meet after choosing.",
  note: "2026/27 semester 1 - Tuesday - checked timetable export",
  times: ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30"],
  courses: [
    {
      code: "INFR09051",
      title: "Informatics Large Practical",
      activity: "Computer Workshop",
      time: "13:10-15:00",
      weeks: "weeks 2, 4, 8 and 10",
    },
    {
      code: "INFR10080",
      title: "Introduction to Databases",
      activity: "Lecture",
      time: "13:10-14:00",
      weeks: "weeks 1-11",
    },
  ],
  overlap: "50 MIN OVERLAP",
  punchline: "One is compulsory. The other is the course you wanted.",
} as const;

export const product = {
  index: "03",
  kicker: "THE FLIP IN ACTION",
  heading: "The week is the input.",
  recreateLabel: "RECREATED UI - DEMO DATA",
  promptLabel: "YOUR WEEK",
  prompt: "Keep Tuesday after 15:00 free.",
  chips: ["Tuesday 15:00+ free", "Year 3", "Clash-free"],
  weekLabel: "YOUR WEEK",
  weekNote: "Semester 1 - tutorial choices are reconstructed",
  freeLabel: "TUESDAY 15:00+",
  solveIdle: "Solve",
  solveBusy: "Solving",
  resultPlaceholder: "Plans appear here",
  resultPlaceholderNote: "Checking degree rules and timetable clashes.",
  planLabel: "PLAN 1",
  planReady: "Fits your week",
  confirmedSymbol: "OK",
  planMisses: "0 MISSES",
  stats: [
    { value: "7", label: "courses" },
    { value: "120", label: "credits" },
    { value: "60 / 60", label: "semester split" },
  ],
  courses: [
    { code: "INFR09032", title: "System Design Project", credits: "20 cr", semester: "S2" },
    { code: "INFR09051", title: "Informatics Large Practical", credits: "20 cr", semester: "S1" },
    { code: "INFR10022", title: "Professional Issues (Level 10)", credits: "10 cr", semester: "S1" },
    { code: "INFR10052", title: "Algorithms and Data Structures", credits: "10 cr", semester: "S1" },
    { code: "INFR10065", title: "Compiling Techniques", credits: "20 cr", semester: "S2" },
    { code: "INFR10067", title: "Computer Security", credits: "20 cr", semester: "S1" },
    { code: "INFR10074", title: "Computer Communications and Networks", credits: "20 cr", semester: "S2" },
  ],
  ledger: [
    { check: "OK", label: "4 compulsory courses", source: "DRPS" },
    { check: "OK", label: "Group A - exactly 50 credits", source: "DRPS" },
    { check: "OK", label: "Clash-free timetable", source: "768 slots checked" },
  ],
  days: ["MON", "TUE", "WED", "THU", "FRI"],
  hours: ["09", "12", "15", "18"],
} as const;

export const weekBlocks = [
  { code: "09051", day: 0, start: 1030, end: 1080, activity: "Lecture" },
  { code: "09051", day: 1, start: 790, end: 900, activity: "Workshop" },
  { code: "09051", day: 2, start: 1030, end: 1080, activity: "Tutorial" },
  { code: "09051", day: 3, start: 790, end: 900, activity: "Workshop" },
  { code: "09051", day: 4, start: 540, end: 590, activity: "Lecture" },
  { code: "10022", day: 0, start: 790, end: 840, activity: "Lecture" },
  { code: "10052", day: 0, start: 970, end: 1020, activity: "Lecture" },
  { code: "10052", day: 3, start: 970, end: 1020, activity: "Lecture" },
  { code: "10067", day: 0, start: 600, end: 650, activity: "Lecture" },
  { code: "10067", day: 2, start: 600, end: 650, activity: "Lecture" },
  { code: "10067", day: 4, start: 600, end: 650, activity: "Lecture" },
] as const;

export const stack = {
  index: "04",
  kicker: "THE STACK",
  heading: "One runtime from interface to evidence.",
  chips: ["Next.js 16", "React 19", "TypeScript", "MongoDB Atlas", "zod"],
  layers: [
    { number: "01", label: "DESCRIBE", title: "Plain English becomes preferences." },
    { number: "02", label: "SOLVE", title: "Hard rules. Soft preferences." },
    { number: "03", label: "PROVE", title: "Every plan links to degree law." },
  ],
  aiLine: "AI helps parse and explain. The deterministic solver decides legality.",
  builtLine: "Built with Codex and human direction.",
  stats: brand.proof,
} as const;

export const limits = {
  index: "05",
  kicker: "THE BOUNDARY",
  heading: "Real enough to trust. Small enough to be honest.",
  groups: [
    {
      label: "REAL NOW",
      items: [
        "2026/27 DRPS catalogue and programme rules",
        "Checked-in timetable export with 570 slots",
        "Deterministic degree and clash checking",
        "Source-linked rules a student can inspect",
      ],
    },
    {
      label: "DEMO BOUNDARY",
      items: [
        "One programme: BSc Computer Science",
        "Not a live timetable feed",
        "Tutorial groups are requests, not allocations",
        "Product visuals are recreated for this video",
      ],
    },
    {
      label: "NEXT",
      items: [
        "Live catalogue and timetable refresh",
        "More programmes and schedules",
        "More DPT prose as typed, source-linked rules",
        "Central tutorial-group allocation",
      ],
    },
  ],
} as const;

export const ending = {
  index: "06",
  kicker: "THE INVERSION",
  statement: "Start with the week you want.",
  support: "Then check the law.",
  repoLabel: "SOURCE",
  repo: "github.com/ppowdderr/aperture",
  teamLabel: "BUILT BY",
  team: "Lewis Simpson and Ink",
} as const;

const cue = (text: string, startMs: number, endMs: number): Caption => ({
  text,
  startMs,
  endMs,
  timestampMs: null,
  confidence: null,
});

export const captions: Caption[] = [
  cue("Aperture.", 350, 3000),
  cue("Describe the week you want. Get back the legal course choices.", 3000, 6800),
  cue("Old assumption: pick courses, then discover the week they produce.", 7000, 10100),
  cue("Aperture flips it: paint the week, then solve for a legal year.", 10100, 13600),
  cue("You stop fitting your life around a timetable.", 13600, 15800),
  cue("A real clash can only appear after you choose.", 16000, 18700),
  cue("INFR09051: Tuesday 13:10 to 15:00.", 18700, 21600),
  cue("INFR10080 starts at 13:10. That is a 50-minute overlap.", 21600, 24800),
  cue("Keep Tuesday after 15:00 free.", 25000, 28200),
  cue("Aperture turns the week into a constraint.", 28200, 31500),
  cue("The solver checks degree law and timetable clashes.", 31500, 35000),
  cue("It returns legal course sets, not a shortlist.", 35000, 38800),
  cue("120 credits. Clash-free. 60 / 60 across semesters.", 38800, 42800),
  cue("Every rule links back to its DRPS source.", 42800, 46600),
  cue("Next.js, React, TypeScript, MongoDB Atlas and zod.", 47000, 50100),
  cue("AI assists parsing and explanation. The solver decides legality.", 50100, 53000),
  cue("Built with Codex and human direction.", 53000, 55000),
  cue("Checked-in 2026/27 data. Not a live feed.", 55000, 58000),
  cue("One programme. Tutorial groups are requests, not allocations.", 58000, 61400),
  cue("Start with the week you want.", 62000, 64800),
  cue("github.com/ppowdderr/aperture. Built by Lewis Simpson and Ink.", 64800, 68000),
];
