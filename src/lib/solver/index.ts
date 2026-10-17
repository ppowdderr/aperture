import type { Preferences, ProgrammeYear, Course, Slot, StudentState, Solution } from "../types";
import { assignGroups } from "./clash";
import { explainCourses, programmeRules } from "./explain";
import { score } from "./score";
import { searchLegalYears } from "./search";

export interface SolveInput {
  programme: ProgrammeYear;
  courses: Course[];
  slots: Slot[];
  student: StudentState;
  preferences: Preferences;
  count?: number;
  /** All years of the programme; lets open option groups exclude other years' compulsory courses. */
  allYears?: ProgrammeYear[];
}

/** Two course sets are "different enough" to show side by side when each has ≥ 2 courses the other lacks. */
export const MIN_DIFFERENT_COURSES = 2;

/** Legal years enumerated before scoring; keeps every real DPT year well under a second. */
export const SEARCH_CAP = 3000;

/** Penalty per unavoidable timetable clash; outweighs any soft preference so clash-free years always rank first. */
export const CLASH_PENALTY = -500;

function differsEnough(a: readonly string[], b: readonly string[]): number {
  const bs = new Set(b);
  return a.filter((c) => !bs.has(c)).length;
}

/**
 * Legal course sets (#9) → tutorial groups (#10) → soft score (#11) → the best `count` solutions
 * that differ from each other in at least two courses. Deterministic for a given input. Years whose
 * fixed lectures clash (it happens in the published timetable) are kept but ranked below clash-free ones.
 */
export function solve(input: SolveInput): Solution[] {
  const { programme, courses, slots, student, preferences } = input;
  const count = input.count ?? 3;
  const byCode = new Map(courses.map((c) => [c.code, c]));
  const legal = searchLegalYears({
    programme,
    courses,
    student,
    allYears: input.allYears,
    pinned: preferences.pinned,
    excluded: preferences.excluded,
    cap: SEARCH_CAP,
  });
  const rules = programmeRules(programme, courses);

  const scored: Solution[] = [];
  for (const year of legal) {
    const assignment = assignGroups(year.courses, slots);
    const chosen = year.courses.map((c) => byCode.get(c)!);
    const s = score(chosen, assignment.groups, slots, preferences);
    scored.push({
      courses: year.courses,
      groups: assignment.groups,
      score: s.score + CLASH_PENALTY * assignment.clashes.length,
      violations: [...assignment.clashes.map((c) => `Clash: ${c}`), ...s.violations],
      reasons: explainCourses(year.courses, year.reasons, courses, preferences),
      rulesSatisfied: rules,
    });
  }
  scored.sort((a, b) => b.score - a.score || a.courses.join().localeCompare(b.courses.join()));

  const picked: Solution[] = [];
  for (const sol of scored) {
    if (picked.length >= count) break;
    if (picked.every((p) => differsEnough(sol.courses, p.courses) >= MIN_DIFFERENT_COURSES)) picked.push(sol);
  }
  return picked;
}
