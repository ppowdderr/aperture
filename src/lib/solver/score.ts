import type { Course, Preferences, Slot } from "../types";
import { groupKey } from "./clash";

export interface ScoreResult {
  /** Higher is better; 0 means no preference touched. */
  score: number;
  /** One line per soft-constraint miss, naming the course and the day/time. */
  violations: string[];
}

/** Points per hour of class (negative = penalty) and per event. */
export const WEIGHTS = {
  freeHour: -100,
  avoidHour: -10,
  preferHour: 5,
  earlyStart: -3,
  lateFinish: -3,
  longGap: -4,
  longRun: -4,
  campusSwitch: -5,
  keyword: 15,
} as const;

/** Prefix on violations no course choice can remove (caused only by fixed slots of compulsory courses). */
export const UNAVOIDABLE = "Unavoidable: ";

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/** Hours to one decimal, without a trailing .0: 4 → "4", 4.1666 → "4.2". */
export function fmtHours(hours: number): string {
  return String(Math.round(hours * 10) / 10);
}

export function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function when(slot: Slot): string {
  return `S${slot.semester} ${DAY[slot.day]} ${fmtTime(slot.start)}–${fmtTime(slot.end)}`;
}

function label(course: Course | undefined, slot: Slot): string {
  const name = course ? `${course.code} ${course.title}` : slot.course;
  return `${name} ${slot.activity.toLowerCase()}`;
}

/** The slots a solution actually attends: fixed activities plus the chosen group of each grouped one. */
export function chosenSlots(courses: Iterable<string>, groups: Record<string, string>, slots: readonly Slot[]): Slot[] {
  const set = new Set(courses);
  return slots.filter(
    (s) => set.has(s.course) && (s.group === undefined || groups[groupKey(s.course, s.activity)] === s.group),
  );
}

function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/**
 * Soft score of a legal course set with its tutorial groups against the student's preferences.
 * Unpainted time is neutral; only painted blocks and controls the student set can produce misses.
 * Misses caused solely by fixed slots of `compulsory` courses are reported with the `UNAVOIDABLE`
 * prefix and not scored, so every plan of a year is judged on what the student can change.
 * Deterministic: output depends only on the arguments; violations are sorted.
 */
export function score(
  courses: readonly Course[],
  groups: Record<string, string>,
  slots: readonly Slot[],
  prefs: Preferences,
  compulsory: ReadonlySet<string> = new Set(),
): ScoreResult {
  const byCode = new Map(courses.map((c) => [c.code, c]));
  const attended = chosenSlots(byCode.keys(), groups, slots);
  let total = 0;
  const violations: string[] = [];
  const fixed = (s: Slot) => s.group === undefined && compulsory.has(s.course);
  const miss = (points: number, text: string, ...involved: Slot[]) => {
    if (involved.length > 0 && involved.every(fixed)) {
      violations.push(UNAVOIDABLE + text);
      return;
    }
    total += points;
    violations.push(text);
  };

  // Painted blocks: hard "free" is a heavy penalty, avoid/prefer are soft. Blocks apply to both semesters.
  for (const slot of attended) {
    for (const block of prefs.blocks) {
      if (block.day !== slot.day) continue;
      const hours = overlapMinutes(slot.start, slot.end, block.start, block.end) / 60;
      if (hours === 0) continue;
      if (block.kind === "free") {
        miss(WEIGHTS.freeHour * hours, `${label(byCode.get(slot.course), slot)} ${when(slot)} falls in time you kept free`, slot);
      } else if (block.kind === "avoid") {
        miss(WEIGHTS.avoidHour * hours, `${label(byCode.get(slot.course), slot)} ${when(slot)} falls in time you'd rather avoid`, slot);
      } else {
        total += WEIGHTS.preferHour * hours;
      }
    }
  }

  // Per semester-day shape: early starts, late finishes, gaps, back-to-back runs, campus switches.
  const days = new Map<string, Slot[]>();
  for (const slot of attended) {
    const k = `${slot.semester}:${slot.day}`;
    days.set(k, [...(days.get(k) ?? []), slot]);
  }
  for (const daySlots of days.values()) {
    daySlots.sort((a, b) => a.start - b.start || a.end - b.end);
    const first = daySlots[0];
    const last = daySlots.reduce((m, s) => (s.end > m.end ? s : m), daySlots[0]);
    if (prefs.earliestStart !== null && first.start < prefs.earliestStart) {
      miss(WEIGHTS.earlyStart, `${label(byCode.get(first.course), first)} ${when(first)} starts before ${fmtTime(prefs.earliestStart)}`, first);
    }
    if (prefs.latestEnd !== null && last.end > prefs.latestEnd) {
      miss(WEIGHTS.lateFinish, `${label(byCode.get(last.course), last)} ${when(last)} finishes after ${fmtTime(prefs.latestEnd)}`, last);
    }

    let runStart = first.start;
    let runEnd = first.end;
    let run: Slot[] = [first];
    const closeRun = (endSlot: Slot) => {
      const hours = (runEnd - runStart) / 60;
      if (prefs.maxBackToBackHours !== null && hours > prefs.maxBackToBackHours) {
        miss(
          WEIGHTS.longRun,
          `${fmtHours(hours)} h back-to-back ending with ${label(byCode.get(endSlot.course), endSlot)} ${when(endSlot)}`,
          ...run,
        );
      }
    };
    let prev = first;
    for (const slot of daySlots.slice(1)) {
      if (slot.start > runEnd) {
        const gap = (slot.start - runEnd) / 60;
        if (prefs.maxGapHours !== null && gap > prefs.maxGapHours) {
          miss(WEIGHTS.longGap, `${fmtHours(gap)} h gap before ${label(byCode.get(slot.course), slot)} ${when(slot)}`, prev, slot);
        }
        closeRun(prev);
        runStart = slot.start;
        runEnd = slot.end;
        run = [slot];
      } else {
        runEnd = Math.max(runEnd, slot.end);
        run.push(slot);
      }
      prev = slot;
    }
    closeRun(prev);

    if (prefs.campusDaysTogether) {
      const campuses = new Set(daySlots.map((s) => s.campus).filter((c) => c !== "other"));
      if (campuses.size > 1) {
        const onCampus = daySlots.filter((s) => s.campus !== "other");
        miss(
          WEIGHTS.campusSwitch,
          `S${first.semester} ${DAY[first.day]} mixes campuses: ${onCampus.map((s) => `${s.course} ${fmtTime(s.start)} (${s.campus})`).join(", ")}`,
          ...onCampus,
        );
      }
    }
  }

  for (const kw of prefs.wantKeywords) {
    const needle = kw.trim().toLowerCase();
    if (!needle) continue;
    for (const c of courses) if (c.title.toLowerCase().includes(needle)) total += WEIGHTS.keyword;
  }

  violations.sort();
  return { score: Math.round(total), violations };
}
