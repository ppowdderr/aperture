"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DegreePanel } from "@/components/DegreePanel";
import { Results } from "@/components/Results";
import { RulesLedger } from "@/components/RulesLedger";
import { Shell } from "@/components/Shell";
import { WeekGrid, emptyPreferences } from "@/components/WeekGrid";
import type { Preferences, Solution, StudentState } from "@/lib/types";
import { loadProfile, parseProfile, profileFileName, profileJson, saveProfile } from "@/lib/profile";
import { loadPreferences, savePreferences, useProgrammeData, useSolve } from "@/lib/use-solve";

const PROGRAMME = "UTCMPSI";
const YEAR: StudentState["year"] = 3;

/** Rendered client-only (see page.tsx) so saved preferences can seed state without a hydration mismatch. */
export function Home() {
  const { data, error: dataError } = useProgrammeData(PROGRAMME);
  const [edited, setEdited] = useState<StudentState | null>(() => loadProfile());
  const [panelKey, setPanelKey] = useState(0);
  const [profileNote, setProfileNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences(emptyPreferences()));
  const [selection, setSelection] = useState<{ of: Solution[]; index: number } | null>(null);

  useEffect(() => savePreferences(preferences), [preferences]);
  useEffect(() => {
    if (edited) saveProfile(edited);
  }, [edited]);

  function exportProfile() {
    if (!student) return;
    const url = URL.createObjectURL(new Blob([profileJson(student)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = profileFileName(student);
    a.click();
    URL.revokeObjectURL(url);
    setProfileNote(`Saved ${a.download}`);
  }

  async function importProfile(file: File | undefined) {
    if (!file) return;
    const r = parseProfile(await file.text());
    if (!r.ok) {
      setProfileNote(r.error);
      return;
    }
    setEdited(r.student);
    setPanelKey((k) => k + 1);
    setProfileNote(`Loaded ${file.name}`);
  }

  // Default passed courses per year: every earlier year's compulsory courses. Year 3 is the starting point.
  const defaults = useMemo(() => {
    if (!data) return null;
    const yearDefaults: Partial<Record<StudentState["year"], string[]>> = {};
    for (const y of data.years) yearDefaults[y.year] = data.years.filter((p) => p.year < y.year).flatMap((p) => p.compulsory).sort();
    const student: StudentState = { programmeCode: PROGRAMME, year: YEAR, passed: yearDefaults[YEAR] ?? [], background: {} };
    return { yearDefaults, student };
  }, [data]);
  const yearDefaults = defaults?.yearDefaults ?? null;
  const student: StudentState | null = edited ?? defaults?.student ?? null;

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
  const [degreeOpen, setDegreeOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const programmeTitle = data?.years[0]?.programmeTitle ?? PROGRAMME;
  const rules = current?.rulesSatisfied ?? [];

  return (
    <Shell
      degree={
        yearDefaults && student ? (
          <div className="flex flex-col gap-3">
            <Disclosure
              open={degreeOpen}
              onToggle={() => setDegreeOpen((o) => !o)}
              label={degreeOpen ? "Done" : "Edit"}
              extra={
                <>
                  {profileNote && <span className="truncate text-[13px] text-fg-faint">{profileNote}</span>}
                  <button type="button" onClick={exportProfile} className={ghostButton}>
                    Export profile
                  </button>
                  <button type="button" onClick={() => fileInput.current?.click()} className={ghostButton}>
                    Import profile
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="application/json,.json"
                    aria-label="Import profile file"
                    className="hidden"
                    onChange={(e) => {
                      void importProfile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </>
              }
              summary={
                <>
                  <span className="text-fg">{programmeTitle}</span>
                  <Dot />
                  <span className="text-fg">Year {student.year}</span>
                  <Dot />
                  <span>
                    {student.passed.length} {student.passed.length === 1 ? "course" : "courses"} passed
                  </span>
                </>
              }
            />
            <div className={degreeOpen ? "max-h-[18rem]" : "hidden"}>
              <DegreePanel
                key={panelKey}
                initialProgrammeCode={student.programmeCode}
                initialYear={student.year}
                initialPassed={student.passed}
                initialBackground={student.background}
                yearDefaults={yearDefaults ?? undefined}
                onChange={setEdited}
              />
            </div>
          </div>
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
              <span role="status" aria-live="polite" className={`text-[13px] ${captionTone}`}>
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
            <label htmlFor="wants" className="mt-1 text-[13px] text-fg-faint">
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
      ledger={
        <div className="flex flex-col gap-3">
          <Disclosure
            open={rulesOpen}
            onToggle={() => setRulesOpen((o) => !o)}
            label={rulesOpen ? "Hide" : "Show"}
            summary={
              rules.length === 0 ? (
                <span>Every rule a plan satisfies, with a link to the DRPS line it came from.</span>
              ) : (
                <span>
                  <span className="text-fg">{rules.length} degree rules</span> satisfied by this plan, each linked to its DRPS line.
                </span>
              )
            }
          />
          {rulesOpen && <RulesLedger rules={rules} />}
        </div>
      }
    />
  );
}

function Dot() {
  return <span aria-hidden className="mx-2 text-fg-faint">·</span>;
}

const ghostButton =
  "shrink-0 rounded-md border border-line px-3 py-1 text-[14px] text-fg-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-accent";

/** One summary line with text buttons on the right; the detail renders below when open. */
function Disclosure({
  open,
  onToggle,
  label,
  summary,
  extra,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  summary: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="min-w-0 truncate text-[15px] text-fg-muted">{summary}</p>
      <div className="flex shrink-0 items-center gap-2">
        {extra}
        <button type="button" aria-expanded={open} onClick={onToggle} className={ghostButton}>
          {label}
        </button>
      </div>
    </div>
  );
}
