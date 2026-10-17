"use client";

import { useState } from "react";
import { UNAVOIDABLE, chosenSlots } from "../lib/solver/score";
import type { Course, Preferences, Slot, Solution } from "../lib/types";
import { emptyPreferences } from "./WeekGrid";
import { COURSE_TINTS, WeekView } from "./WeekView";

export interface ResultsProps {
  solutions: Solution[];
  courses: Course[];
  slots: Slot[];
  preferences: Preferences;
  onPreferencesChange: (next: Preferences) => void;
  /** Controlled plan index; omit to let Results keep its own. */
  selected?: number;
  onSelect?: (index: number) => void;
  /** Shown instead of the default placeholder when there are no solutions (e.g. the solver's 422 message). */
  emptyMessage?: string;
}

export function splitViolations(violations: readonly string[]): { misses: string[]; unavoidable: string[] } {
  return {
    misses: violations.filter((v) => !v.startsWith(UNAVOIDABLE)),
    unavoidable: violations.filter((v) => v.startsWith(UNAVOIDABLE)).map((v) => v.slice(UNAVOIDABLE.length)),
  };
}

/** Tab caption: "fits" only when nothing at all is violated. */
export function fitLabel(s: Solution): string {
  const { misses, unavoidable } = splitViolations(s.violations);
  const parts: string[] = [];
  if (misses.length) parts.push(`${misses.length} ${misses.length === 1 ? "miss" : "misses"}`);
  if (unavoidable.length) parts.push(misses.length ? `${unavoidable.length} forced` : `${unavoidable.length} forced ${unavoidable.length === 1 ? "miss" : "misses"}`);
  return parts.length ? parts.join(" · ") : "fits";
}

const SEM_LABEL = { 1: "S1", 2: "S2", full: "S1+2" } as const;

function reasonText(code: string, reasons: readonly string[]): string {
  return reasons
    .filter((r) => r.startsWith(`${code} `))
    .map((r) => r.slice(code.length + 1).replace(/^forced: /, "").replace(/^chosen from /, ""))
    .join(" · ");
}

/** Toggle a code in `pinned` or `excluded`; a course can't be both. */
export function togglePreference(prefs: Preferences, code: string, list: "pinned" | "excluded"): Preferences {
  const other = list === "pinned" ? "excluded" : "pinned";
  const has = prefs[list].includes(code);
  return {
    ...prefs,
    [list]: has ? prefs[list].filter((c) => c !== code) : [...prefs[list], code].sort(),
    [other]: prefs[other].filter((c) => c !== code),
  };
}

export function Results({ solutions, courses, slots, preferences, onPreferencesChange, selected, onSelect, emptyMessage }: ResultsProps) {
  const [internal, setInternal] = useState(0);
  const [semester, setSemester] = useState<1 | 2>(1);
  const index = Math.min(selected ?? internal, Math.max(0, solutions.length - 1));
  const select = (i: number) => {
    setInternal(i);
    onSelect?.(i);
  };
  const solution = solutions[index];
  const byCode = new Map(courses.map((c) => [c.code, c]));

  if (!solution) {
    return <p className="text-fg-faint">{emptyMessage ?? "Up to three valid years that match your week will appear here."}</p>;
  }
  const { misses, unavoidable } = splitViolations(solution.violations);

  const attended = chosenSlots(solution.courses, solution.groups, slots);
  const tintOf = (code: string) => COURSE_TINTS[Math.max(0, solution.courses.indexOf(code)) % COURSE_TINTS.length];
  const credits = (sem: 1 | 2) =>
    solution.courses.reduce((sum, code) => {
      const c = byCode.get(code);
      if (!c) return sum;
      return sum + (c.semester === "full" ? c.credits / 2 : c.semester === sem ? c.credits : 0);
    }, 0);

  return (
    <div className="@container flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
      <div role="tablist" aria-label="Plans" className="flex gap-1 self-start rounded-md border border-line bg-panel-2 p-0.5 text-[15px]">
        {solutions.map((s, i) => (
          <button
            key={i}
            role="tab"
            type="button"
            aria-selected={i === index}
            onClick={() => select(i)}
            className={`rounded-[5px] px-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              i === index ? "bg-panel text-fg shadow-[inset_0_0_0_1px_var(--color-line-strong)]" : "text-fg-muted hover:text-fg"
            }`}
          >
            Plan {i + 1}
            <span className="ml-2 font-mono text-[12px] text-fg-faint">
              {fitLabel(s)}
            </span>
          </button>
        ))}
      </div>

      <div role="tablist" aria-label="Semester" className="flex gap-1 rounded-md border border-line bg-panel-2 p-0.5 text-[14px] @[64rem]:hidden">
          {([1, 2] as const).map((s) => (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={semester === s}
              onClick={() => setSemester(s)}
              className={`rounded-[5px] px-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                semester === s ? "bg-panel text-fg shadow-[inset_0_0_0_1px_var(--color-line-strong)]" : "text-fg-muted hover:text-fg"
              }`}
            >
              Semester {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-[340px] flex-1 grid-cols-1 gap-5 @[64rem]:grid-cols-2">
        <div className={`${semester === 1 ? "flex" : "hidden"} min-h-0 flex-col @[64rem]:flex`}>
          <WeekView semester={1} slots={attended} courses={courses} tintOf={tintOf} />
        </div>
        <div className={`${semester === 2 ? "flex" : "hidden"} min-h-0 flex-col @[64rem]:flex`}>
          <WeekView semester={2} slots={attended} courses={courses} tintOf={tintOf} />
        </div>
      </div>

      <div className="grid shrink-0 gap-4 lg:grid-cols-[3fr_2fr]">
        <section aria-label="Courses" className="min-w-0">
          <h3 className="mb-1 text-[13px] text-fg-muted">
            {solution.courses.length} courses · <span className="font-mono">{credits(1)}</span> / <span className="font-mono">{credits(2)}</span>{" "}
            credits
          </h3>
          <ul className="divide-y divide-line rounded-md border border-line bg-panel-2 text-[15px]">
            {solution.courses.map((code) => {
              const c = byCode.get(code);
              const pinned = preferences.pinned.includes(code);
              const excluded = preferences.excluded.includes(code);
              return (
                <li key={code} className="flex items-center gap-3 px-3 py-2.5">
                  <span aria-hidden className="h-3 w-1 shrink-0 rounded-full" style={{ background: tintOf(code) }} />
                  <span className="w-[6.5rem] shrink-0 font-mono text-[14px] text-fg-muted">{code}</span>
                  <span className="min-w-0 flex-1 truncate">{c?.title ?? code}</span>
                  <span className="hidden max-w-[10rem] shrink-0 truncate text-[12px] text-fg-faint min-[1440px]:block" title={reasonText(code, solution.reasons)}>
                    {reasonText(code, solution.reasons)}
                  </span>
                  <span className="shrink-0 font-mono text-[12px] text-fg-faint">
                    {c ? `${c.credits} cr · ${SEM_LABEL[c.semester]}` : ""}
                  </span>
                  <button
                    type="button"
                    aria-pressed={pinned}
                    aria-label={`${pinned ? "Unpin" : "Pin"} ${code}`}
                    onClick={() => onPreferencesChange(togglePreference(preferences, code, "pinned"))}
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      pinned ? "bg-accent-dim text-accent" : "text-fg-faint hover:text-fg"
                    }`}
                  >
                    {pinned ? "Pinned" : "Pin"}
                  </button>
                  <button
                    type="button"
                    aria-pressed={excluded}
                    aria-label={`${excluded ? "Allow" : "Exclude"} ${code}`}
                    onClick={() => onPreferencesChange(togglePreference(preferences, code, "excluded"))}
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      excluded ? "bg-panel text-fg line-through" : "text-fg-faint hover:text-fg"
                    }`}
                  >
                    {excluded ? "Excluded" : "Exclude"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Misses" className="min-w-0">
          <h3 className="mb-1 text-[13px] text-fg-muted">
            {misses.length > 0 ? "Where it misses" : unavoidable.length > 0 ? "Only forced misses" : "Fits everything you asked for"}{" "}
            <span className="font-mono text-fg-faint">score {solution.score}</span>
          </h3>
          {misses.length > 0 && (
            <ul className="max-h-56 divide-y divide-line overflow-auto rounded-md border border-line bg-panel-2 text-[14px] leading-snug text-fg-muted">
              {misses.map((v) => (
                <li key={v} className="px-3 py-2">
                  {v}
                </li>
              ))}
            </ul>
          )}
          {unavoidable.length > 0 && (
            <div className="mt-3">
              <h4 className="mb-1 text-[13px] text-fg-muted">
                Forced by compulsory courses — no plan for this year can avoid {unavoidable.length === 1 ? "it" : "them"}
              </h4>
              <ul className="max-h-40 divide-y divide-line overflow-auto rounded-md border border-line bg-panel-2 text-[14px] leading-snug text-fg-faint">
                {unavoidable.map((v) => (
                  <li key={v} className="px-3 py-2">
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Holds pin/exclude state locally until #19 wires page-level state and `/api/solve`. */
export function ResultsStandalone(props: Omit<ResultsProps, "preferences" | "onPreferencesChange">) {
  const [preferences, setPreferences] = useState<Preferences>(emptyPreferences);
  return <Results {...props} preferences={preferences} onPreferencesChange={setPreferences} />;
}
