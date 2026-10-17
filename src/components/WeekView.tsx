import type { Course, Slot } from "../lib/types";
import { DAY_END, DAY_START, fmt } from "./WeekGrid";

const SPAN = DAY_END - DAY_START;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const CAMPUS: Record<Slot["campus"], string> = { central: "Central", kb: "King's Buildings", other: "Other" };

/** Muted tints, one per course in a plan. Low saturation so the grid stays quiet; the code label carries the meaning. */
export const COURSE_TINTS = [
  "hsl(210 30% 30%)",
  "hsl(150 25% 27%)",
  "hsl(30 30% 30%)",
  "hsl(275 22% 32%)",
  "hsl(0 28% 32%)",
  "hsl(90 22% 28%)",
  "hsl(330 22% 31%)",
  "hsl(180 25% 27%)",
];

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

export interface WeekViewProps {
  semester: 1 | 2;
  /** Slots actually attended (fixed activities plus chosen groups), any semester; filtered here. */
  slots: readonly Slot[];
  courses: readonly Course[];
  /** Course code → tint index, shared across both semesters so a course keeps its colour. */
  tintOf: (code: string) => string;
}

export function WeekView({ semester, slots, courses, tintOf }: WeekViewProps) {
  const titles = new Map(courses.map((c) => [c.code, c.title]));
  const hours = Array.from({ length: SPAN / 60 }, (_, i) => DAY_START / 60 + i);
  const byDay = DAYS.map((_, day) => layoutLanes(mergeWeekRanges(slots.filter((s) => s.semester === semester && s.day === day))));

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[2rem_1fr] grid-rows-[1.25rem_1fr] gap-x-2 gap-y-1 text-[11px] text-fg-faint">
      <div className="font-medium text-fg-muted">S{semester}</div>
      <div className="grid grid-cols-5" aria-hidden>
        {DAYS.map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="relative font-mono" aria-hidden>
        {hours.map((h) => (
          <div key={h} className="absolute right-0 -translate-y-1/2 leading-none" style={{ top: `${((h * 60 - DAY_START) / SPAN) * 100}%` }}>
            {String(h).padStart(2, "0")}
          </div>
        ))}
      </div>
      <div
        role="group"
        aria-label={`Semester ${semester} timetable`}
        className="relative rounded-md border border-line bg-panel-2"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)",
          backgroundSize: `20% 100%, 100% ${100 / (SPAN / 60)}%`,
          backgroundPosition: "-1px 0, 0 -1px",
        }}
      >
        {byDay.flatMap((laid, day) =>
          laid.map(({ slot, lane, lanes }) => {
            const start = Math.max(slot.start, DAY_START);
            const end = Math.min(slot.end, DAY_END);
            if (end <= start) return null;
            const weeks = slot.weeks.length ? `, weeks ${slot.weeks[0]}–${slot.weeks[slot.weeks.length - 1]}` : "";
            const title = `${slot.course} ${titles.get(slot.course) ?? ""}\n${slot.activity}${slot.group ? ` ${slot.group}` : ""} · ${DAY_NAMES[day]} ${fmt(slot.start)}–${fmt(slot.end)}${weeks}\n${slot.room} · ${CAMPUS[slot.campus]}`;
            return (
              <div
                key={`${slot.course}-${slot.activity}-${slot.group ?? ""}-${slot.day}-${slot.start}-${slot.end}`}
                title={title}
                data-lane={lane}
                data-lanes={lanes}
                className="absolute overflow-hidden rounded-[4px] px-1.5 py-1 leading-tight text-fg"
                style={{
                  left: `calc(${day * 20}% + ${(20 / lanes) * lane}% + 2px)`,
                  width: `calc(${20 / lanes}% - 3px)`,
                  top: `calc(${((start - DAY_START) / SPAN) * 100}% + 1px)`,
                  height: `calc(${((end - start) / SPAN) * 100}% - 2px)`,
                  background: tintOf(slot.course),
                }}
              >
                <div className="truncate font-mono text-[10px]">{lanes > 1 ? slot.course.replace(/^[A-Z]+/, "") : slot.course}</div>
                {end - start >= 60 && lanes === 1 && <div className="truncate text-fg-muted">{slot.activity}</div>}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
