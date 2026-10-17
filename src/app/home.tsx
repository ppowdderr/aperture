"use client";

import { useEffect, useMemo, useState } from "react";
import { DegreePanel } from "@/components/DegreePanel";
import { Results } from "@/components/Results";
import { RulesLedger } from "@/components/RulesLedger";
import { Shell } from "@/components/Shell";
import { WeekGrid, emptyPreferences } from "@/components/WeekGrid";
import type { Preferences, Solution, StudentState } from "@/lib/types";
import { loadPreferences, savePreferences, useProgrammeData, useSolve } from "@/lib/use-solve";

const PROGRAMME = "UTCMPSI";
const YEAR: StudentState["year"] = 3;

/** Rendered client-only (see page.tsx) so saved preferences can seed state without a hydration mismatch. */
export function Home() {
  const { data, error: dataError } = useProgrammeData(PROGRAMME);
  const [edited, setEdited] = useState<StudentState | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences(emptyPreferences()));
  const [selection, setSelection] = useState<{ of: Solution[]; index: number } | null>(null);

  useEffect(() => savePreferences(preferences), [preferences]);

  // Default passed courses per year: every earlier year's compulsory courses. Year 3 is the starting point.
  const yearDefaults = useMemo(() => {
    if (!data) return null;
    const out: Partial<Record<StudentState["year"], string[]>> = {};
    for (const y of data.years) out[y.year] = data.years.filter((p) => p.year < y.year).flatMap((p) => p.compulsory).sort();
    return out;
  }, [data]);
  const defaultPassed = yearDefaults?.[YEAR] ?? null;
  const student = useMemo<StudentState | null>(
    () => edited ?? (defaultPassed ? { programmeCode: PROGRAMME, year: YEAR, passed: defaultPassed, background: {} } : null),
    [edited, defaultPassed],
  );

  const solve = useSolve(student, preferences);
  const selected = selection?.of === solve.solutions ? selection.index : 0;
  const current = solve.solutions[Math.min(selected, Math.max(0, solve.solutions.length - 1))];

  const caption = (() => {
    if (dataError) return `Could not load programme data: ${dataError}`;
    if (solve.status === "loading") return "Solving…";
    if (solve.status === "error") return solve.error ?? "Solve failed";
    if (solve.status === "empty") return "No legal year fits those pins, exclusions and passed courses. Loosen one.";
    if (solve.status === "ready")
      return `${solve.solutions.length} ${solve.solutions.length === 1 ? "plan" : "plans"}${solve.ms !== null ? ` in ${solve.ms} ms` : ""}. Edits re-solve on their own.`;
    return "Paint the week you want; plans appear on the right.";
  })();
  const captionTone = dataError || solve.status === "error" ? "text-amber-200" : "text-fg-faint";

  return (
    <Shell
      degree={
        defaultPassed ? (
          <DegreePanel
            initialProgrammeCode={PROGRAMME}
            initialYear={YEAR}
            initialPassed={defaultPassed}
            yearDefaults={yearDefaults ?? undefined}
            onChange={setEdited}
          />
        ) : (
          <p className="text-fg-faint">{dataError ? `Could not load programme data: ${dataError}` : "Loading programme…"}</p>
        )
      }
      week={
        <div className="flex min-h-full flex-col gap-4">
          <WeekGrid value={preferences} onChange={setPreferences} />
          <form
            className="flex shrink-0 flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              solve.solveNow();
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <span role="status" aria-live="polite" className={`text-[12px] ${captionTone}`}>
                {caption}
              </span>
              <button
                type="submit"
                disabled={!student}
                className="h-9 shrink-0 rounded-md bg-accent px-4 font-medium text-bg hover:brightness-110 disabled:opacity-50"
              >
                {solve.status === "loading" ? "Solving…" : "Solve"}
              </button>
            </div>
            <label htmlFor="wants" className="mt-1 text-[12px] text-fg-faint">
              What you want, in your own words
            </label>
            <textarea
              id="wants"
              rows={3}
              disabled
              placeholder="No 9ams on Monday or Tuesday, Friday off, something with machine learning or databases, keep King's Buildings days together, no gaps longer than two hours."
              className="min-h-[4.5rem] max-h-40 w-full resize-y rounded-md border border-line bg-panel-2 px-3 py-2 placeholder:text-fg-faint disabled:opacity-70 field-sizing-content"
            />
          </form>
        </div>
      }
      results={
        data ? (
          <Results
            solutions={solve.solutions}
            courses={data.courses}
            slots={data.slots}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            selected={selected}
            onSelect={(index) => setSelection({ of: solve.solutions, index })}
            emptyMessage={solve.status === "empty" || solve.status === "error" ? caption : undefined}
          />
        ) : (
          <p className="text-fg-faint">Up to three valid years that match your week will appear here.</p>
        )
      }
      ledger={<RulesLedger rules={current?.rulesSatisfied ?? []} />}
    />
  );
}
