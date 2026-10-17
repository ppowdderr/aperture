"use client";

import { useState } from "react";
import { UNAVOIDABLE } from "../lib/solver/score";
import type { Course, Preferences, Solution } from "../lib/types";
import { COURSE_TINTS, FORCED_OUTLINE } from "./WeekView";

export interface ResultsProps {
  solutions: Solution[];
  courses: Course[];
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

/** Tab caption: "fits" only when nothing at all is violated. `compact` fits a narrow tab: "2 + 6 forced". */
export function fitLabel(s: Solution, compact = false): string {
  const { misses, unavoidable } = splitViolations(s.violations);
  const m = misses.length;
  const f = unavoidable.length;
  if (!m && !f) return "fits";
  if (compact) return m && f ? `${m} + ${f} forced` : m ? `${m} ${m === 1 ? "miss" : "misses"}` : `${f} forced`;
  const parts: string[] = [];
  if (m) parts.push(`${m} ${m === 1 ? "miss" : "misses"}`);
  if (f) parts.push(m ? `${f} forced` : `${f} forced ${f === 1 ? "miss" : "misses"}`);
  return parts.join(" · ");
}

export const tintFor = (solution: Solution) => (code: string) =>
  COURSE_TINTS[Math.max(0, solution.courses.indexOf(code)) % COURSE_TINTS.length];

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

const textButton = "shrink-0 rounded px-1.5 py-0.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent";

/** The inspector: which plan, what's in it, where it misses. The plan itself is drawn on the week grid. */
export function Results({ solutions, courses, preferences, onPreferencesChange, selected, onSelect, emptyMessage }: ResultsProps) {
  const [internal, setInternal] = useState(0);
  const index = Math.min(selected ?? internal, Math.max(0, solutions.length - 1));
  const select = (i: number) => {
    setInternal(i);
    onSelect?.(i);
  };
  const solution = solutions[index];
  const byCode = new Map(courses.map((c) => [c.code, c]));

  if (!solution) {
    return <p className="text-[15px] text-fg-faint">{emptyMessage ?? "Paint the week you want; up to three legal plans will appear here."}</p>;
  }
  const { misses, unavoidable } = splitViolations(solution.violations);
  const tintOf = tintFor(solution);
  const credits = (sem: 1 | 2) =>
    solution.courses.reduce((sum, code) => {
      const c = byCode.get(code);
      if (!c) return sum;
      return sum + (c.semester === "full" ? c.credits / 2 : c.semester === sem ? c.credits : 0);
    }, 0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div role="tablist" aria-label="Plans" className="grid grid-cols-3 gap-0.5 rounded-md border border-line bg-panel-2 p-0.5 text-[15px]">
        {solutions.map((s, i) => (
          <button
            key={i}
            role="tab"
            type="button"
            aria-selected={i === index}
            onClick={() => select(i)}
            className={`rounded-[5px] px-3 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              i === index ? "bg-panel text-fg shadow-[inset_0_0_0_1px_var(--color-line-strong)]" : "text-fg-muted hover:text-fg"
            }`}
          >
            Plan {i + 1}
            <span className="block truncate font-mono text-[12px] text-fg-faint">{fitLabel(s, true)}</span>
          </button>
        ))}
      </div>

      <section aria-label="Courses" className="min-w-0">
        <h3 className="mb-1 text-[13px] text-fg-muted">
          {solution.courses.length} courses · <span className="font-mono">{credits(1)}</span> / <span className="font-mono">{credits(2)}</span> credits
        </h3>
        <ul className="divide-y divide-line">
          {solution.courses.map((code) => {
            const c = byCode.get(code);
            const pinned = preferences.pinned.includes(code);
            const excluded = preferences.excluded.includes(code);
            return (
              <li key={code} className="grid grid-cols-[4px_minmax(0,1fr)_auto] gap-x-3 py-2.5">
                <span aria-hidden className="mt-1.5 h-[calc(100%-0.75rem)] w-1 rounded-full" style={{ background: tintOf(code) }} />
                <div className="min-w-0">
                  <div className="text-[15px] leading-snug">{c?.title ?? code}</div>
                  <div className="mt-0.5 text-[13px] text-fg-faint">
                    <span className="font-mono">{code}</span>
                    {c ? ` · ${c.credits} cr · ${SEM_LABEL[c.semester]}` : ""}
                    {reasonText(code, solution.reasons) ? ` · ${reasonText(code, solution.reasons)}` : ""}
                  </div>
                </div>
                <div className="flex items-start gap-1">
                  <button
                    type="button"
                    aria-pressed={pinned}
                    aria-label={`${pinned ? "Unpin" : "Pin"} ${code}`}
                    onClick={() => onPreferencesChange(togglePreference(preferences, code, "pinned"))}
                    className={`${textButton} ${pinned ? "bg-accent-dim text-accent" : "text-fg-faint hover:text-fg"}`}
                  >
                    {pinned ? "Pinned" : "Pin"}
                  </button>
                  <button
                    type="button"
                    aria-pressed={excluded}
                    aria-label={`${excluded ? "Allow" : "Exclude"} ${code}`}
                    onClick={() => onPreferencesChange(togglePreference(preferences, code, "excluded"))}
                    className={`${textButton} ${excluded ? "bg-panel-2 text-fg line-through" : "text-fg-faint hover:text-fg"}`}
                  >
                    {excluded ? "Excluded" : "Exclude"}
                  </button>
                </div>
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
        {(misses.length > 0 || unavoidable.length > 0) && (
          <ul className="divide-y divide-line text-[14px] leading-snug text-fg-muted">
            {misses.map((v) => (
              <li key={v} className="py-2">
                {v}
              </li>
            ))}
            {unavoidable.map((v) => (
              <li key={v} className="py-2">
                <span className="mr-2 font-mono text-[11px] tracking-wide" style={{ color: FORCED_OUTLINE }}>
                  FORCED
                </span>
                {v} <span className="text-fg-faint">— compulsory, no plan for this year avoids it</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
