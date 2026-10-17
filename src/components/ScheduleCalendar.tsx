import type { Course, Slot } from "../lib/types";
import { DAY_END, DAY_START, fmt } from "./WeekGrid";
import { FORCED_OUTLINE, layoutLanes, mergeWeekRanges, slotKey } from "./WeekView";

const SPAN = DAY_END - DAY_START;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const CAMPUS = { central: "Central", kb: "King's Buildings", other: "Other" } as const;

interface ScheduleCalendarProps {
  semester: 1 | 2;
  slots: readonly Slot[];
  courses: readonly Course[];
  tintOf: (code: string) => string;
  forced?: ReadonlySet<string>;
}

function cellStyle(day: number, start: number, end: number, lane: number, lanes: number) {
  return {
    left: `calc(${day * 20}% + ${(20 / lanes) * lane}% + 3px)`,
    width: `calc(${20 / lanes}% - 6px)`,
    top: `calc(${((start - DAY_START) / SPAN) * 100}% + 2px)`,
    height: `calc(${((end - start) / SPAN) * 100}% - 4px)`,
  };
}

/** A read-only semester timetable. Editing the constraints happens in the WeekGrid sheet. */
export function ScheduleCalendar({ semester, slots, courses, tintOf, forced }: ScheduleCalendarProps) {
  const titles = new Map(courses.map((course) => [course.code, course.title]));
  const byDay = DAYS.map((_, day) =>
    layoutLanes(mergeWeekRanges(slots.filter((slot) => slot.semester === semester && slot.day === day))),
  );
  const hasClasses = byDay.some((day) => day.length > 0);
  const hours = Array.from({ length: SPAN / 60 }, (_, index) => DAY_START / 60 + index);

  return (
    <section aria-label={`Semester ${semester} timetable`} className="min-h-0">
      <div className="grid min-h-[540px] grid-cols-[2.5rem_1fr] grid-rows-[1.75rem_1fr] gap-x-2 gap-y-1 text-[13px] text-fg-muted select-none">
        <div />
        <div className="grid grid-cols-5">
          {DAYS.map((day) => (
            <div key={day} className="text-center font-medium text-fg-muted">
              {day}
            </div>
          ))}
        </div>
        <div className="relative font-mono tabular-nums" aria-hidden>
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute right-0 -translate-y-1/2 leading-none"
              style={{ top: `${((hour * 60 - DAY_START) / SPAN) * 100}%` }}
            >
              {String(hour).padStart(2, "0")}
            </div>
          ))}
        </div>
        <div
          role="list"
          aria-label={`Semester ${semester} classes`}
          className="relative min-h-[500px] overflow-hidden rounded-md border border-line bg-surface"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-rule) 1px, transparent 1px), linear-gradient(to bottom, var(--color-rule) 1px, transparent 1px)",
            backgroundSize: `20% 100%, 100% ${100 / (SPAN / 60)}%`,
            backgroundPosition: "-1px 0, 0 -1px",
          }}
        >
          {!hasClasses && (
            <p className="absolute inset-0 grid place-items-center px-6 text-center text-[15px] text-fg-muted">
              No classes in semester {semester}.
            </p>
          )}
          {byDay.flatMap((day, dayIndex) =>
            day.map(({ slot, lane, lanes }) => {
              const start = Math.max(slot.start, DAY_START);
              const end = Math.min(slot.end, DAY_END);
              if (end <= start) return null;
              const title = titles.get(slot.course) ?? "";
              const weeks = slot.weeks.length ? `, weeks ${slot.weeks[0]}–${slot.weeks[slot.weeks.length - 1]}` : "";
              const isForced = forced?.has(slotKey(slot)) ?? false;
              const label = `${slot.course} ${title}, ${slot.activity}${slot.group ? ` ${slot.group}` : ""}, ${DAY_NAMES[dayIndex]} ${fmt(slot.start)}–${fmt(slot.end)}, ${slot.room}, ${CAMPUS[slot.campus]}${weeks}`;
              const tallEnough = end - start >= 55;

              return (
                <div
                  key={`${slot.course}-${slot.activity}-${slot.group ?? ""}-${dayIndex}-${slot.start}-${slot.end}`}
                  role="listitem"
                  tabIndex={0}
                  aria-label={label}
                  title={label}
                  className="absolute z-[1] overflow-hidden rounded px-1.5 py-1 text-left leading-tight text-course-ink outline-offset-1 focus-visible:outline-2 focus-visible:outline-accent"
                  style={{
                    ...cellStyle(dayIndex, start, end, lane, lanes),
                    background: tintOf(slot.course),
                    outline: isForced ? `2px solid ${FORCED_OUTLINE}` : undefined,
                    outlineOffset: isForced ? "-2px" : undefined,
                  }}
                >
                  <div className="truncate text-[12px] font-bold">
                    <span className="sm:hidden">{slot.course.slice(4)}</span>
                    <span className="hidden sm:inline">{lanes > 1 ? slot.course.slice(4) : slot.course}</span>
                  </div>
                  {tallEnough && <div className="truncate text-[12px] font-medium">{title}</div>}
                  {tallEnough && end - start >= 80 && (
                    <div className="truncate text-[11px] opacity-75">
                      {slot.activity}
                      {slot.group ? ` · ${slot.group}` : ""}
                    </div>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </section>
  );
}
