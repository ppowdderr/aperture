"use client";

import { chips } from "./Chat";
import { Controls, DAY_END, DAY_START, placeBlock } from "./WeekGrid";
import type { Course, Preferences, TimeBlock } from "@/lib/types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

export interface PreferencesSettingsProps {
  value: Preferences;
  courses: Course[];
  onChange: (next: Preferences) => void;
}

function isWholeDayOff(blocks: TimeBlock[], day: TimeBlock["day"]): boolean {
  return blocks.some(
    (block) =>
      block.day === day &&
      block.kind === "free" &&
      block.start <= DAY_START &&
      block.end >= DAY_END,
  );
}

export function PreferencesSettings({
  value,
  courses,
  onChange,
}: PreferencesSettingsProps) {
  const titles = new Map(courses.map((course) => [course.code, course.title]));
  const applied = chips(value, titles);

  function toggleDay(day: TimeBlock["day"], off: boolean): void {
    if (off) {
      onChange({
        ...value,
        blocks: placeBlock(value.blocks, {
          id: `settings-day-${day}`,
          day,
          start: DAY_START,
          end: DAY_END,
          kind: "free",
        }),
      });
      return;
    }
    onChange({
      ...value,
      blocks: value.blocks.filter(
        (block) =>
          !(
            block.day === day &&
            block.kind === "free" &&
            block.start <= DAY_START &&
            block.end >= DAY_END
          ),
      ),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-medium text-fg">Days off</h3>
        <p className="mt-1 text-[13px] text-fg-faint">
          Changes apply immediately and re-solve the plans.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 @[32rem]:grid-cols-3">
          {DAYS.map((name, day) => (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-panel-2 px-3 py-2 text-[14px] text-fg"
            >
              <input
                type="checkbox"
                checked={isWholeDayOff(value.blocks, day as TimeBlock["day"])}
                onChange={(event) =>
                  toggleDay(day as TimeBlock["day"], event.target.checked)
                }
                className="h-4 w-4 accent-accent"
              />
              No classes on {name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-[15px] font-medium text-fg">Day shape</h3>
        <Controls value={value} onChange={onChange} />
      </div>

      <div>
        <h3 className="text-[15px] font-medium text-fg">Applied settings</h3>
        {applied.length === 0 ? (
          <p className="mt-1 text-[13px] text-fg-faint">
            Nothing is set. Describe a week in chat or add a manual rule above.
          </p>
        ) : (
          <ul aria-label="Applied settings" className="mt-2 flex flex-wrap gap-1.5">
            {applied.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-1 rounded-md border border-line bg-panel-2 pl-2.5 pr-1 text-[13px] text-fg"
              >
                {item.text}
                <button
                  type="button"
                  aria-label={`Remove: ${item.text}`}
                  onClick={() => onChange(item.remove(value))}
                  className="rounded px-1 text-fg-faint hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
