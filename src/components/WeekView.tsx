import type { Course, Slot } from "../lib/types";
import { UNAVOIDABLE } from "../lib/solver/score";
import { DAY_END, DAY_START, fmt } from "./WeekGrid";

const SPAN = DAY_END - DAY_START;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const CAMPUS: Record<Slot["campus"], string> = { central: "Central", kb: "King's Buildings", other: "Other" };

/** Muted tints, one per course in a plan. Low saturation so the grid stays quiet; the text label carries the meaning. */
export const COURSE_TINTS = [
  "hsl(217 85% 90%)",
  "hsl(150 45% 88%)",
  "hsl(30 85% 88%)",
  "hsl(275 55% 91%)",
  "hsl(0 70% 92%)",
  "hsl(90 45% 87%)",
  "hsl(330 60% 92%)",
  "hsl(180 50% 87%)",
];

export const FORCED_OUTLINE = "#b7791f";

/** The export lists one row per week range; a lecture taught weeks 1-2 and 3-10 at the same time is one cell here. */
export function mergeWeekRanges(slots: readonly Slot[]): Slot[] {
  const merged = new Map<string, Slot>();
  for (const s of slots) {
    const key = `${s.course}|${s.activity}|${s.group ?? ""}|${s.semester}|${s.day}|${s.start}|${s.end}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...s, weeks: [...s.weeks] });
      continue;
    }
    prev.weeks = [...new Set([...prev.weeks, ...s.weeks])].sort((a, b) => a - b);
    if (prev.room !== s.room && !prev.room.includes(s.room)) prev.room = `${prev.room} / ${s.room}`;
  }
  return [...merged.values()];
}

export interface LaidOutSlot {
  slot: Slot;
  lane: number;
  lanes: number;
}

/**
 * Places a day's slots in side-by-side lanes so overlapping ones never draw on top of each other.
 * Sorted by start; a slot joins the first lane whose last slot has ended.
 */
export function layoutLanes(slots: readonly Slot[]): LaidOutSlot[] {
  const sorted = [...slots].sort((a, b) => a.start - b.start || a.end - b.end || a.course.localeCompare(b.course));
  const out: LaidOutSlot[] = [];
  let cluster: LaidOutSlot[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const s of cluster) s.lanes = laneEnds.length;
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };
  for (const slot of sorted) {
    if (slot.start >= clusterEnd && cluster.length) flush();
    let lane = laneEnds.findIndex((end) => end <= slot.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = slot.end;
    clusterEnd = Math.max(clusterEnd, slot.end);
    cluster.push({ slot, lane, lanes: 0 });
  }
  flush();
  return out;
}

export const slotKey = (s: Pick<Slot, "course" | "semester" | "day" | "start">) => `${s.course}|${s.semester}|${s.day}|${s.start}`;

/** Slots named by forced ("Unavoidable: …") violations, e.g. "Unavoidable: INFR09051 … lecture S1 Fri 09:00–09:50 falls …". */
export function forcedKeys(violations: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const v of violations) {
    if (!v.startsWith(UNAVOIDABLE)) continue;
    const m = /([A-Z]{4}\d{5}) .*?\bS([12]) (Mon|Tue|Wed|Thu|Fri) (\d\d):(\d\d)–/.exec(v);
    if (!m) continue;
    out.add(`${m[1]}|${m[2]}|${DAYS.indexOf(m[3] as (typeof DAYS)[number])}|${Number(m[4]) * 60 + Number(m[5])}`);
  }
  return out;
}

export interface PlanCellsProps {
  semester: 1 | 2;
  /** Slots actually attended (fixed activities plus chosen groups), any semester; filtered here. */
  slots: readonly Slot[];
  courses: readonly Course[];
  tintOf: (code: string) => string;
  /** `slotKey`s of classes that sit in a painted block because of a compulsory course; outlined. */
  forced?: ReadonlySet<string>;
}

/**
 * A plan's classes for one semester as absolutely positioned cells, meant to be rendered inside the
 * WeekGrid canvas (same 08–18 axis) underneath the painted blocks.
 */
export function PlanCells({ semester, slots, courses, tintOf, forced }: PlanCellsProps) {
  const titles = new Map(courses.map((c) => [c.code, c.title]));
  const byDay = DAYS.map((_, day) => layoutLanes(mergeWeekRanges(slots.filter((s) => s.semester === semester && s.day === day))));
  return (
    <div aria-label={`Semester ${semester} classes`} role="group" className="pointer-events-none absolute inset-0 z-0">
      {byDay.flatMap((laid, day) =>
        laid.map(({ slot, lane, lanes }) => {
          const start = Math.max(slot.start, DAY_START);
          const end = Math.min(slot.end, DAY_END);
          if (end <= start) return null;
          const weeks = slot.weeks.length ? `, weeks ${slot.weeks[0]}–${slot.weeks[slot.weeks.length - 1]}` : "";
          const isForced = forced?.has(slotKey(slot)) ?? false;
          const title = `${slot.course} ${titles.get(slot.course) ?? ""}\n${slot.activity}${slot.group ? ` ${slot.group}` : ""} · ${DAY_NAMES[day]} ${fmt(slot.start)}–${fmt(slot.end)}${weeks}\n${slot.room} · ${CAMPUS[slot.campus]}${isForced ? "\nForced: compulsory course inside a block you painted" : ""}`;
          return (
            <div
              key={`${slot.course}-${slot.activity}-${slot.group ?? ""}-${slot.day}-${slot.start}-${slot.end}`}
              title={title}
              data-lane={lane}
              data-lanes={lanes}
              data-forced={isForced || undefined}
              className="pointer-events-auto absolute overflow-hidden rounded-[4px] px-2 py-1 leading-snug text-fg"
              style={{
                left: `calc(${day * 20}% + ${(20 / lanes) * lane}% + 3px)`,
                width: `calc(${20 / lanes}% - 5px)`,
                top: `calc(${((start - DAY_START) / SPAN) * 100}% + 1px)`,
                height: `calc(${((end - start) / SPAN) * 100}% - 2px)`,
                background: tintOf(slot.course),
                outline: isForced ? `1.5px solid ${FORCED_OUTLINE}` : undefined,
                outlineOffset: isForced ? "-1.5px" : undefined,
              }}
            >
              <div className="truncate text-[13px]">
                <span className="font-mono text-[12px]">{lanes > 1 ? slot.course.replace(/^[A-Z]+/, "") : slot.course}</span>
                {lanes === 1 && <span className="ml-1.5 text-fg">{titles.get(slot.course)}</span>}
              </div>
              {lanes === 1 && end - start >= 60 && <div className="truncate text-[12px] text-fg-muted">{slot.activity}</div>}
            </div>
          );
        }),
      )}
    </div>
  );
}
