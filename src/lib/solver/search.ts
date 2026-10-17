import type { Course, OptionGroup, ProgrammeYear, Rule, Slot, StudentState } from "../types";
import { slotsOverlap } from "./clash";

/** Boolean prerequisite expression parsed from the "MUST have passed" clause of DRPS prose. */
export type PrereqExpr =
  | { op: "course"; code: string }
  | { op: "and" | "or"; items: PrereqExpr[] };

export interface LegalYear {
  courses: string[];
  credits: number;
  /** Credits in semester 1 and 2; `full` courses count half in each. */
  semesterCredits: [number, number];
  /** One line per decision the search made for this set, e.g. "INFR09051 forced: compulsory". */
  reasons: string[];
}

export interface SearchInput {
  programme: ProgrammeYear;
  courses: Course[];
  student: StudentState;
  pinned?: string[];
  excluded?: string[];
  /** Every year of the programme; lets open groups exclude courses that are compulsory elsewhere. */
  allYears?: ProgrammeYear[];
  /** Fixed timetable activities; lets the DFS discard clashy sets before they count toward `cap`. */
  slots?: Slot[];
  /** Rules explicitly accepted by the student after prose extraction. */
  rules?: Rule[];
  /** Stop after this many legal sets. */
  cap?: number;
}

export const TOTAL_CREDITS = 120;
export const SEMESTER_MIN = 40;
export const SEMESTER_MAX = 80;

const CODE = /^[A-Z]{4}\d{5}$/;

/**
 * Parses the hard prerequisite clause. Course names are dropped so only codes, AND/OR and
 * brackets remain; AND binds tighter than OR, matching how DRPS brackets its own prose.
 * Returns null when the text has no "MUST have passed" clause.
 */
export function parsePrerequisites(text: string): PrereqExpr | null {
  const m = /MUST have passed:?([\s\S]*?)(?=It is RECOMMENDED|Students MUST|$)/i.exec(text);
  if (!m) return null;
  const tokens = m[1]
    .replace(/\(\s*([A-Z]{4}\d{5})\s*\)/g, " $1 ")
    .replace(/\((?:(?![A-Z]{4}\d{5}|\bAND\b|\bOR\b)[^()])*\)/g, " ")
    .match(/[A-Z]{4}\d{5}|\bAND\b|\bOR\b|[()]/g);
  if (!tokens || !tokens.some((t) => CODE.test(t))) return null;
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const factor = (): PrereqExpr | null => {
    const t = next();
    if (t === "(") {
      const e = expr();
      if (peek() === ")") next();
      return e;
    }
    return t && /^[A-Z]{4}\d{5}$/.test(t) ? { op: "course", code: t } : null;
  };
  const chain = (op: "and" | "or", below: () => PrereqExpr | null): PrereqExpr | null => {
    const items: PrereqExpr[] = [];
    const first = below();
    if (first) items.push(first);
    while (peek()?.toUpperCase() === op.toUpperCase()) {
      next();
      const e = below();
      if (e) items.push(e);
    }
    if (items.length === 0) return null;
    return items.length === 1 ? items[0] : { op, items };
  };
  const term = () => chain("and", factor);
  const expr = () => chain("or", term);
  return expr();
}

export function prereqCodes(e: PrereqExpr): string[] {
  return e.op === "course" ? [e.code] : e.items.flatMap(prereqCodes);
}

/**
 * True when `passed` satisfies the expression. Codes in `unknown` (not in this programme's
 * catalogue, usually retired codes left in DRPS prose) are assumed met rather than blocking.
 */
export function prereqSatisfied(e: PrereqExpr, passed: Set<string>, unknown: Set<string>): boolean {
  if (e.op === "course") return passed.has(e.code) || unknown.has(e.code);
  return e.op === "and"
    ? e.items.every((x) => prereqSatisfied(x, passed, unknown))
    : e.items.some((x) => prereqSatisfied(x, passed, unknown));
}

/** "Level 9 and 10 courses in Schedules A to R" → [9, 10]. */
export function scheduleLevels(schedules: string | undefined): number[] {
  if (!schedules) return [];
  const m = /Level\s+(\d+)(?:\s*(?:and|to|,)\s*(\d+))?/i.exec(schedules);
  if (!m) return [];
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  return Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => Math.min(a, b) + i);
}

interface Resolved {
  group: OptionGroup;
  members: Set<string>;
}

function sortCodes(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Resolves each option group's membership to courses present in the catalogue. Closed groups
 * list their courses; open groups (`courses: []` with `schedules`) accept any catalogue course at
 * the named levels that is not compulsory in any year or in a closed group this year.
 * Sub-groups (with `parent`) also widen the parent.
 */
export function resolveGroups(
  programme: ProgrammeYear,
  courses: Course[],
  allYears: ProgrammeYear[] = [programme],
): Resolved[] {
  const byCode = new Map(courses.map((c) => [c.code, c]));
  const closed = new Set<string>(programme.compulsory);
  for (const y of allYears) for (const c of y.compulsory) closed.add(c);
  for (const g of programme.groups) for (const c of g.courses) closed.add(c);
  const resolved: Resolved[] = programme.groups.map((group) => {
    if (group.courses.length > 0)
      return { group, members: new Set(group.courses.filter((c) => byCode.has(c))) };
    const levels = new Set(scheduleLevels(group.schedules));
    const members = new Set<string>();
    for (const c of courses) if (levels.has(c.level) && !closed.has(c.code)) members.add(c.code);
    return { group, members };
  });
  for (const r of resolved) {
    if (!r.group.parent) continue;
    const parent = resolved.find((p) => p.group.id === r.group.parent);
    if (parent) for (const c of r.members) if (byCode.has(c)) parent.members.add(c);
  }
  return resolved;
}

function semesterSplit(c: Course): [number, number] {
  if (c.semester === "full") return [c.credits / 2, c.credits / 2];
  return c.semester === 1 ? [c.credits, 0] : [0, c.credits];
}

/**
 * Enumerates course sets that form a legal year: every compulsory course, each option group
 * within its credit range, 120 credits, 40–80 per semester, hard prerequisites passed, and
 * `pinned`/`excluded` honoured. Depth-first over candidates with credit-feasibility pruning,
 * compulsory first, so the first result is found almost immediately.
 */
/**
 * Courses the solver could place for this student in this year, with the reason a code can't be:
 * compulsory and option-group members not already passed whose hard prerequisites are passed.
 */
export function placeableCourses(
  input: Pick<SearchInput, "programme" | "courses" | "student" | "allYears">,
): { placeable: Set<string>; reasonNot: (code: string) => string } {
  const byCode = new Map(input.courses.map((c) => [c.code, c]));
  const passed = new Set(input.student.passed);
  const groups = resolveGroups(input.programme, input.courses, input.allYears);
  const members = new Set<string>(input.programme.compulsory);
  for (const g of groups) for (const m of g.members) members.add(m);
  const unknown = new Set<string>();
  const prereqs = new Map<string, PrereqExpr>();
  for (const c of input.courses) {
    const e = parsePrerequisites(c.prerequisitesText);
    if (e) prereqs.set(c.code, e);
  }
  for (const e of prereqs.values()) for (const code of prereqCodes(e)) if (!byCode.has(code)) unknown.add(code);
  const placeable = new Set<string>();
  for (const code of members) {
    if (!byCode.has(code) || passed.has(code)) continue;
    const e = prereqs.get(code);
    if (!e || prereqSatisfied(e, passed, unknown)) placeable.add(code);
  }
  const reasonNot = (code: string) => {
    if (!byCode.has(code)) return "isn't in the course catalogue";
    if (passed.has(code)) return "is already in your passed courses";
    if (!members.has(code)) return `isn't an option in year ${input.programme.year} of your programme`;
    return "has a prerequisite you haven't passed";
  };
  return { placeable, reasonNot };
}

export function searchLegalYears(input: SearchInput): LegalYear[] {
  const { programme, student } = input;
  const cap = input.cap ?? 5000;
  const byCode = new Map(input.courses.map((c) => [c.code, c]));
  const passed = new Set(student.passed);
  const excluded = new Set(input.excluded ?? []);
  const pinned = new Set(input.pinned ?? []);
  const groups = resolveGroups(programme, input.courses, input.allYears);
  const rules = input.rules ?? [];

  for (const rule of rules) {
    if (
      rule.kind === "mustPassBefore" &&
      student.year >= rule.year &&
      !passed.has(rule.course)
    ) {
      return [];
    }
  }
  const extraPrerequisites = new Map<string, string[]>();
  for (const rule of rules) {
    if (rule.kind !== "prerequisite") continue;
    const requirements = extraPrerequisites.get(rule.course) ?? [];
    requirements.push(...rule.requires);
    extraPrerequisites.set(rule.course, requirements);
  }

  const forced = programme.compulsory.filter((c) => !passed.has(c));
  for (const c of forced) if (!byCode.has(c) || excluded.has(c)) return [];
  for (const c of pinned) if (!byCode.has(c) || excluded.has(c) || passed.has(c)) return [];

  const prereqs = new Map<string, PrereqExpr>();
  for (const c of input.courses) {
    const e = parsePrerequisites(c.prerequisitesText);
    if (e) prereqs.set(c.code, e);
  }
  const unknown = new Set<string>();
  for (const e of prereqs.values())
    for (const code of prereqCodes(e)) if (!byCode.has(code)) unknown.add(code);

  const forcedSet = new Set(forced);
  const optional = new Set<string>();
  for (const g of groups) for (const m of g.members) if (!forcedSet.has(m)) optional.add(m);
  const ok = (code: string) => {
    if (passed.has(code) || excluded.has(code)) return false;
    if (
      (extraPrerequisites.get(code) ?? []).some(
        (requirement) => !passed.has(requirement),
      )
    ) {
      return false;
    }
    const e = prereqs.get(code);
    return !e || prereqSatisfied(e, passed, unknown);
  };
  const candidates = [...optional].filter(ok).sort(sortCodes);
  for (const c of forced) if (!ok(c)) return [];
  for (const c of pinned) if (!forcedSet.has(c) && !candidates.includes(c)) return [];

  const groupOf = (code: string) => groups.filter((g) => g.members.has(code));
  const groupCredit = groups.map(() => 0);
  const groupRemaining = groups.map((g) =>
    [...g.members].filter((m) => forcedSet.has(m) || candidates.includes(m)).reduce((s, m) => s + byCode.get(m)!.credits, 0),
  );
  const fixedSlots = new Map<string, Slot[]>();
  for (const slot of input.slots ?? []) {
    if (slot.group !== undefined) continue;
    const courseSlots = fixedSlots.get(slot.course) ?? [];
    courseSlots.push(slot);
    fixedSlots.set(slot.course, courseSlots);
  }

  const chosen: string[] = [];
  let credits = 0;
  let sem: [number, number] = [0, 0];
  const results: LegalYear[] = [];

  const add = (code: string, sign: 1 | -1) => {
    const c = byCode.get(code)!;
    credits += sign * c.credits;
    const [a, b] = semesterSplit(c);
    sem = [sem[0] + sign * a, sem[1] + sign * b];
    for (const g of groupOf(code)) groupCredit[groups.indexOf(g)] += sign * c.credits;
  };

  const reasonsFor = (set: string[]) =>
    set.map((code) => {
      if (forcedSet.has(code)) return `${code} forced: compulsory`;
      if (pinned.has(code)) return `${code} pinned by you`;
      const g = groupOf(code).map((x) => x.group.id);
      return `${code} chosen from ${g.length ? `group ${g.join(", ")}` : "options"}`;
    });

  const complete = () =>
    credits === TOTAL_CREDITS &&
    sem[0] >= SEMESTER_MIN && sem[0] <= SEMESTER_MAX &&
    sem[1] >= SEMESTER_MIN && sem[1] <= SEMESTER_MAX &&
    groups.every((g, i) => groupCredit[i] >= g.group.minCredits && groupCredit[i] <= g.group.maxCredits);

  const introducesAvoidableFixedClash = (code: string) => {
    const incoming = fixedSlots.get(code);
    if (!incoming || incoming.length === 0) return false;
    for (const other of chosen) {
      if (forcedSet.has(code) && forcedSet.has(other)) continue;
      const existing = fixedSlots.get(other);
      if (!existing) continue;
      if (incoming.some((a) => existing.some((b) => slotsOverlap(a, b)))) return true;
    }
    return false;
  };

  // Credits still obtainable from candidates at index >= i, used to prune dead branches.
  const suffix = new Array<number>(candidates.length + 1).fill(0);
  for (let i = candidates.length - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + byCode.get(candidates[i])!.credits;

  const feasible = (i: number) => {
    if (credits > TOTAL_CREDITS || credits + suffix[i] < TOTAL_CREDITS) return false;
    if (sem[0] > SEMESTER_MAX || sem[1] > SEMESTER_MAX) return false;
    for (let g = 0; g < groups.length; g++) {
      if (groupCredit[g] > groups[g].group.maxCredits) return false;
      if (groupCredit[g] + groupRemaining[g] < groups[g].group.minCredits) return false;
    }
    return true;
  };

  const dfs = (i: number) => {
    if (results.length >= cap) return;
    if (!feasible(i)) return;
    if (i === candidates.length) {
      if (complete()) {
        const set = [...chosen].sort(sortCodes);
        results.push({ courses: set, credits, semesterCredits: [sem[0], sem[1]], reasons: reasonsFor(set) });
      }
      return;
    }
    const code = candidates[i];
    const gs = groupOf(code).map((g) => groups.indexOf(g));
    const c = byCode.get(code)!.credits;
    // take
    if (!introducesAvoidableFixedClash(code)) {
      chosen.push(code);
      add(code, 1);
      for (const g of gs) groupRemaining[g] -= c;
      dfs(i + 1);
      for (const g of gs) groupRemaining[g] += c;
      add(code, -1);
      chosen.pop();
    }
    // skip (not allowed for pinned)
    if (pinned.has(code)) return;
    for (const g of gs) groupRemaining[g] -= c;
    dfs(i + 1);
    for (const g of gs) groupRemaining[g] += c;
  };

  for (const code of forced) {
    chosen.push(code);
    add(code, 1);
  }
  dfs(0);
  return results;
}
