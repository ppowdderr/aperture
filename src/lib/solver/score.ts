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

const EARLY = 10 * 60;
const LATE = 17 * 60;
const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri"];

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
 * Deterministic: output depends only on the arguments; violations are sorted.
 */
export function score(
  courses: readonly Course[],
  groups: Record<string, string>,
  slots: readonly Slot[],
  prefs: Preferences,
): ScoreResult {
  const byCode = new Map(courses.map((c) => [c.code, c]));
  const attended = chosenSlots(byCode.keys(), groups, slots);
  let total = 0;
  const violations: string[] = [];

  // Painted blocks: hard "free" is a heavy penalty, avoid/prefer are soft. Blocks apply to both semesters.
  for (const slot of attended) {
    for (const block of prefs.blocks) {
      if (block.day !== slot.day) continue;
      const hours = overlapMinutes(slot.start, slot.end, block.start, block.end) / 60;
      if (hours === 0) continue;
      if (block.kind === "free") {
        total += WEIGHTS.freeHour * hours;
        violations.push(`${label(byCode.get(slot.course), slot)} ${when(slot)} falls in time you kept free`);
      } else if (block.kind === "avoid") {
        total += WEIGHTS.avoidHour * hours;
        violations.push(`${label(byCode.get(slot.course), slot)} ${when(slot)} falls in time you'd rather avoid`);
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
    if (first.start < EARLY) {
      total += WEIGHTS.earlyStart;
      violations.push(`${label(byCode.get(first.course), first)} ${when(first)} starts before 10:00`);
    }
    if (last.end > LATE) {
      total += WEIGHTS.lateFinish;
      violations.push(`${label(byCode.get(last.course), last)} ${when(last)} finishes after 17:00`);
    }

    let runStart = first.start;
    let runEnd = first.end;
    const closeRun = (endSlot: Slot) => {
      const hours = (runEnd - runStart) / 60;
      if (hours > prefs.maxBackToBackHours) {
        total += WEIGHTS.longRun;
        violations.push(
          `${hours} h back-to-back ending with ${label(byCode.get(endSlot.course), endSlot)} ${when(endSlot)}`,
        );
      }
    };
    let prev = first;
    for (const slot of daySlots.slice(1)) {
      if (slot.start > runEnd) {
        const gap = (slot.start - runEnd) / 60;
        if (gap > prefs.maxGapHours) {
          total += WEIGHTS.longGap;
          violations.push(`${gap} h gap before ${label(byCode.get(slot.course), slot)} ${when(slot)}`);
        }
        closeRun(prev);
        runStart = slot.start;
        runEnd = slot.end;
      } else {
        runEnd = Math.max(runEnd, slot.end);
      }
      prev = slot;
    }
    closeRun(prev);

    if (prefs.campusDaysTogether) {
      const campuses = new Set(daySlots.map((s) => s.campus).filter((c) => c !== "other"));
      if (campuses.size > 1) {
        total += WEIGHTS.campusSwitch;
        violations.push(
          `S${first.semester} ${DAY[first.day]} mixes campuses: ${daySlots
            .filter((s) => s.campus !== "other")
            .map((s) => `${s.course} ${fmtTime(s.start)} (${s.campus})`)
            .join(", ")}`,
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
  return { score: total, violations };
}
