/** Shared domain types. Everything else imports from here; change via PR with a note. */

export type Semester = 1 | 2 | "full";

export interface Course {
  code: string;             // e.g. "INFR09051"
  title: string;
  credits: number;          // 10 | 20 | 40 ...
  level: number;            // SCQF level, 7-11
  semester: Semester;
  school: string;
  prerequisitesText: string;   // raw DRPS prose; parsed rules live in Rule
  drpsUrl: string;
}

/** One row of a Degree Programme Table option group. */
export interface OptionGroup {
  id: string;               // "A", "B", ...
  title: string;
  minCredits: number;
  maxCredits: number;
  courses: string[];        // course codes; empty means "any course matching `schedules`"
  schedules?: string;       // e.g. "Level 9 and 10 courses in Schedules A to Q"
  notesText: string;        // raw prose under the group
}

export interface ProgrammeYear {
  programmeCode: string;    // "UTCMPSI"
  programmeTitle: string;   // "Computer Science (BSc Hons)"
  year: 1 | 2 | 3 | 4 | 5;
  compulsory: string[];     // course codes
  groups: OptionGroup[];
  notesText: string;        // year-level prose (progression rules etc.)
  drpsUrl: string;
}

export type Campus = "central" | "kb" | "other";

/** A timetabled activity. Alternative tutorial groups share `activity` and differ in `group`. */
export interface Slot {
  course: string;           // course code
  activity: string;         // "Lecture", "Tutorial 1", "Lab" ...
  group?: string;           // "Group 3"; undefined for lectures
  semester: 1 | 2;
  day: 0 | 1 | 2 | 3 | 4;   // Mon-Fri
  start: number;            // minutes since 00:00, e.g. 540 = 09:00
  end: number;
  weeks: number[];          // teaching weeks, 1-11
  room: string;
  campus: Campus;
}

export type CellPaint = "never" | "avoid" | "prefer" | null;

export interface Preferences {
  /** grid[day][hour-8] for 08..18 → 5 x 11 */
  grid: CellPaint[][];
  maxBackToBackHours: number;
  maxGapHours: number;
  campusDaysTogether: boolean;
  wantKeywords: string[];     // "databases", "machine learning"
  pinned: string[];           // course codes that must be included
  excluded: string[];         // course codes that must not be included
}

/** A typed rule derived from DPT/catalogue prose. `source` is the exact sentence it came from. */
export type Rule =
  | { kind: "compulsory"; course: string; source: string; url: string }
  | { kind: "creditRange"; group: string; min: number; max: number; source: string; url: string }
  | { kind: "prerequisite"; course: string; requires: string[]; source: string; url: string }
  | { kind: "mustPassBefore"; course: string; year: number; source: string; url: string }
  | { kind: "conditional"; course: string; condition: string; source: string; url: string };

export interface StudentState {
  programmeCode: string;
  year: ProgrammeYear["year"];
  passed: string[];
  background: Record<string, string>;   // e.g. { maths: "A-level A*" } for conditional rules
}

export interface Solution {
  courses: string[];
  groups: Record<string, string>;       // activity id → chosen group
  score: number;
  violations: string[];                 // soft-constraint misses, human readable
  reasons: string[];                    // "INFR09051 forced: compulsory"
  rulesSatisfied: Rule[];
}
