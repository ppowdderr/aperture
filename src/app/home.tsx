"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chat } from "@/components/Chat";
import { DegreePanel } from "@/components/DegreePanel";
import { Results, tintFor } from "@/components/Results";
import { RulesLedger } from "@/components/RulesLedger";
import { Controls, WeekGrid, emptyPreferences } from "@/components/WeekGrid";
import { FORCED_OUTLINE, PlanCells, forcedKeys } from "@/components/WeekView";
import { chosenSlots } from "@/lib/solver/score";
import type { Preferences, Solution, StudentState } from "@/lib/types";
import { loadProfile, parseProfile, profileFileName, profileJson, saveProfile } from "@/lib/profile";
import { loadPreferences, savePreferences, useProgrammeData, useSolve } from "@/lib/use-solve";

const PROGRAMME = "UTCMPSI";
const YEAR: StudentState["year"] = 3;

const ghostButton =
  "shrink-0 rounded-md border border-line px-3 py-1 text-[14px] text-fg-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

/** Rendered client-only (see plan/page.tsx) so saved preferences can seed state without a hydration mismatch. */
export function Home() {
  const { data, error: dataError } = useProgrammeData(PROGRAMME);
  const [edited, setEdited] = useState<StudentState | null>(() => loadProfile());
  const [panelKey, setPanelKey] = useState(0);
  const [profileNote, setProfileNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences(emptyPreferences()));
  const [selection, setSelection] = useState<{ of: Solution[]; index: number } | null>(null);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [sheet, setSheet] = useState<"degree" | "rules" | null>(null);

  useEffect(() => savePreferences(preferences), [preferences]);
  useEffect(() => {
    if (edited) saveProfile(edited);
  }, [edited]);
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

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
  const attended = useMemo(
    () => (current && data ? chosenSlots(current.courses, current.groups, data.slots) : []),
    [current, data],
  );
  const forced = useMemo(() => (current ? forcedKeys(current.violations) : new Set<string>()), [current]);

  const caption = (() => {
    if (dataError) return `Could not load programme data: ${dataError}`;
    if (solve.status === "loading") return "Solving…";
    if (solve.status === "error") return solve.error ?? "Solve failed";
    if (solve.status === "empty") return "No legal year fits those pins, exclusions and passed courses. Loosen one.";
    if (solve.status === "ready")
      return `${solve.solutions.length} ${solve.solutions.length === 1 ? "plan" : "plans"}${solve.ms !== null ? ` in ${solve.ms} ms` : ""} · edits re-solve on their own`;
    return "Drag on the week to keep time free; plans appear as you go.";
  })();
  const captionTone = dataError || solve.status === "error" ? "text-amber-200" : "text-fg-faint";
  const programmeTitle = data?.years[0]?.programmeTitle ?? PROGRAMME;
  const rules = current?.rulesSatisfied ?? [];

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

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b border-line px-6">
        <Link href="/" className="text-[17px] font-semibold tracking-tight hover:text-fg">
          Aperture
        </Link>
        {student ? (
          <div className="flex min-w-0 items-center gap-2 text-[15px] text-fg-muted">
            <span className="truncate">
              <span className="text-fg">{programmeTitle}</span>
              <Dot />
              <span className="text-fg">Year {student.year}</span>
              <Dot />
              {student.passed.length} {student.passed.length === 1 ? "course" : "courses"} passed
            </span>
            <button type="button" onClick={() => setSheet("degree")} className={ghostButton}>
              Edit
            </button>
            <button type="button" onClick={exportProfile} className={ghostButton}>
              Export
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} className={ghostButton}>
              Import
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
            {profileNote && <span className="truncate text-[13px] text-fg-faint">{profileNote}</span>}
          </div>
        ) : (
          <span className="text-[15px] text-fg-faint">{dataError ? `Could not load programme data: ${dataError}` : "Loading programme…"}</span>
        )}
        <span role="status" aria-live="polite" className={`ml-auto hidden truncate text-[14px] md:block ${captionTone}`}>
          {caption}
        </span>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[24rem_minmax(0,1fr)_24rem]">
        <section aria-label="Chat" className="flex min-h-0 flex-col border-r border-line px-5 py-5">
          {data && student ? (
            <Chat student={student} courses={data.courses} preferences={preferences} onPreferencesChange={setPreferences} />
          ) : (
            <p className="text-[15px] text-fg-faint">Loading…</p>
          )}
        </section>
        <section aria-label="Your week" className="flex min-h-0 flex-col px-6 pt-5 pb-4">
          <div className="mb-4 flex shrink-0 flex-wrap items-end gap-x-6 gap-y-3">
            <Controls value={preferences} onChange={setPreferences} />
            <div role="tablist" aria-label="Semester" className="ml-auto flex gap-0.5 rounded-md border border-line bg-panel-2 p-0.5 text-[14px]">
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
          <WeekGrid
            value={preferences}
            onChange={setPreferences}
            controls={false}
            overlay={
              current && data ? (
                <PlanCells semester={semester} slots={attended} courses={data.courses} tintOf={tintFor(current)} forced={forced} />
              ) : null
            }
          />
          <div className="mt-3 flex shrink-0 items-center justify-between text-[14px] text-fg-faint">
            <span>Drag to keep time free · click a block to change it · ⌘Z undo</span>
            <span className="flex items-center gap-5">
              <span className="flex items-center gap-2">
                <i aria-hidden className="inline-block h-3 w-3 rounded-[3px] border border-dashed border-fg-muted" /> your blocks
              </span>
              {current && (
                <span className="flex items-center gap-2">
                  <i aria-hidden className="inline-block h-3 w-3 rounded-[3px]" style={{ background: tintFor(current)(current.courses[0]) }} /> plan {selected + 1}
                </span>
              )}
              {forced.size > 0 && (
                <span className="flex items-center gap-2">
                  <i aria-hidden className="inline-block h-3 w-3 rounded-[3px]" style={{ outline: `1.5px solid ${FORCED_OUTLINE}`, outlineOffset: -1.5 }} /> forced miss
                </span>
              )}
            </span>
          </div>
        </section>

        <aside aria-label="Results" className="flex min-h-0 flex-col gap-6 overflow-auto border-l border-line px-5 py-5">
          {data ? (
            <Results
              solutions={solve.solutions}
              courses={data.courses}
              preferences={preferences}
              onPreferencesChange={setPreferences}
              selected={selected}
              onSelect={(index) => setSelection({ of: solve.solutions, index })}
              emptyMessage={solve.status === "empty" || solve.status === "error" ? caption : undefined}
            />
          ) : (
            <p className="text-[15px] text-fg-faint">Loading…</p>
          )}
        </aside>
      </main>

      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-line px-6 text-[14px] text-fg-faint">
        <span>
          {rules.length > 0 ? (
            <>
              <span className="text-fg-muted">{rules.length} degree rules</span> satisfied by this plan ·{" "}
              <button type="button" onClick={() => setSheet("rules")} className="text-fg-muted underline-offset-4 hover:text-fg hover:underline">
                show the rules
              </button>
            </>
          ) : (
            "Every rule a plan satisfies will be listed here, linked to its DRPS line."
          )}
        </span>
        <span className="flex gap-4">
          <a href="https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm" target="_blank" rel="noreferrer" className="hover:text-fg">
            DRPS
          </a>
          <a href="https://github.com/ppowdderr/aperture" target="_blank" rel="noreferrer" className="hover:text-fg">
            GitHub
          </a>
        </span>
      </footer>

      {sheet && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/50" onPointerDown={() => setSheet(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheet === "degree" ? "Your degree" : "Rules this plan satisfies"}
            className="@container flex h-full w-[min(48rem,100vw)] flex-col gap-4 overflow-auto border-l border-line bg-panel px-6 py-5 shadow-[0_0_48px_rgba(0,0,0,0.5)]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-medium tracking-tight">{sheet === "degree" ? "Your degree" : "Rules this plan satisfies"}</h2>
              <button type="button" onClick={() => setSheet(null)} className={ghostButton}>
                Done
              </button>
            </div>
            {sheet === "degree" && student && yearDefaults && (
              <DegreePanel
                key={panelKey}
                initialProgrammeCode={student.programmeCode}
                initialYear={student.year}
                initialPassed={student.passed}
                initialBackground={student.background}
                yearDefaults={yearDefaults}
                onChange={setEdited}
              />
            )}
            {sheet === "rules" && <RulesLedger rules={rules} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Dot() {
  return <span aria-hidden className="mx-2 text-fg-faint">·</span>;
}
