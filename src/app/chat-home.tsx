"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatConversation } from "@/components/ChatConversation";
import { DegreePanel } from "@/components/DegreePanel";
import { PlannerWorkspace } from "@/components/PlannerWorkspace";
import { RuleConfirm } from "@/components/RuleConfirm";
import { Sheet } from "@/components/Sheet";
import { emptyPreferences } from "@/components/WeekGrid";
import { hasAppliedPreferences } from "@/lib/preferences";
import { loadProfile, parseProfile, profileFileName, profileJson, saveProfile } from "@/lib/profile";
import type { Preferences, Rule, Solution, StudentState } from "@/lib/types";
import { loadPreferences, savePreferences, useProgrammeData, useSolve } from "@/lib/use-solve";

const PROGRAMME = "UTCMPSI";
const YEAR: StudentState["year"] = 3;

const secondaryButton =
  "min-h-10 shrink-0 rounded-md border border-line px-3 text-[14px] font-medium text-fg-muted hover:border-line-strong hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";

/** Rendered client-only (see chat/page.tsx) so saved preferences seed state without a hydration mismatch. */
export function ChatHome() {
  const [initialPreferences] = useState<Preferences>(() => loadPreferences(emptyPreferences()));
  const returning = hasAppliedPreferences(initialPreferences);

  const { data, error: dataError } = useProgrammeData(PROGRAMME);
  const [edited, setEdited] = useState<StudentState | null>(() => loadProfile());
  const [panelKey, setPanelKey] = useState(0);
  const [profileNote, setProfileNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [workspaceOpen, setWorkspaceOpen] = useState(returning);
  const [selection, setSelection] = useState<{ of: Solution[]; index: number } | null>(null);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [profileOpen, setProfileOpen] = useState(false);
  const resultPanel = useRef<HTMLElement>(null);

  useEffect(() => savePreferences(preferences), [preferences]);
  useEffect(() => {
    if (edited) saveProfile(edited);
  }, [edited]);

  const defaults = useMemo(() => {
    if (!data) return null;
    const yearDefaults: Partial<Record<StudentState["year"], string[]>> = {};
    for (const year of data.years) {
      yearDefaults[year.year] = data.years
        .filter((programmeYear) => programmeYear.year < year.year)
        .flatMap((programmeYear) => programmeYear.compulsory)
        .sort();
    }
    const student: StudentState = { programmeCode: PROGRAMME, year: YEAR, passed: yearDefaults[YEAR] ?? [], background: {} };
    return { yearDefaults, student };
  }, [data]);

  const yearDefaults = defaults?.yearDefaults ?? null;
  const student = edited ?? defaults?.student ?? null;
  const chatStudent: StudentState = student ?? { programmeCode: PROGRAMME, year: YEAR, passed: [], background: {} };
  const solve = useSolve(student, preferences);

  const selected = selection?.of === solve.solutions ? selection.index : 0;
  const current = solve.solutions[Math.min(selected, Math.max(0, solve.solutions.length - 1))];
  const programmeTitle = data?.years[0]?.programmeTitle ?? "Computer Science (BSc Hons)";
  const planStatus = dataError ? "error" : solve.solvedFor !== preferences ? "loading" : solve.status;
  const planMessage = dataError ?? solve.error ?? undefined;

  const applyPreferences = useCallback((next: Preferences) => {
    setPreferences(next);
    setWorkspaceOpen(true);
    setSelection(null);
  }, []);

  function revealResult() {
    setWorkspaceOpen(true);
    if (typeof window.matchMedia !== "function" || !window.matchMedia("(max-width: 1023px)").matches) return;
    if (typeof requestAnimationFrame !== "function") return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resultPanel.current?.scrollIntoView({ block: "start", behavior }));
    });
  }

  const closeProfile = useCallback(() => setProfileOpen(false), []);

  function exportProfile() {
    if (!student) return;
    const url = URL.createObjectURL(new Blob([profileJson(student)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = profileFileName(student);
    anchor.click();
    URL.revokeObjectURL(url);
    setProfileNote(`Saved ${anchor.download}`);
  }

  async function importProfile(file: File | undefined) {
    if (!file) return;
    const result = parseProfile(await file.text());
    if (!result.ok) {
      setProfileNote(result.error);
      return;
    }
    setEdited(result.student);
    setPanelKey((key) => key + 1);
    setProfileNote(`Loaded ${file.name}`);
  }

  function confirmRules(rules: Rule[]) {
    if (!student) return;
    setEdited((current) => {
      const base = current ?? student;
      const merged = [...(base.confirmedRules ?? [])];
      const identity = (rule: Rule) =>
        `${rule.kind}:${rule.kind === "creditRange" ? rule.group : rule.course}:${rule.source}`;
      for (const rule of rules) {
        if (!merged.some((existing) => identity(existing) === identity(rule))) merged.push(rule);
      }
      return { ...base, confirmedRules: merged };
    });
    setProfileNote(`${rules.length} ${rules.length === 1 ? "rule" : "rules"} confirmed`);
  }

  return (
    <div className="chat-theme flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex min-h-16 shrink-0 items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="text-[17px] font-semibold tracking-tight text-fg">
          Aperture
        </Link>
        <span aria-hidden className="h-5 w-px bg-line" />
        <div className="hidden min-w-0 text-[14px] text-fg-muted sm:block">
          <span className="block truncate">
            <span className="font-medium text-fg">{programmeTitle}</span>
            <span aria-hidden className="px-2 text-fg-muted">·</span>
            Year {YEAR}
          </span>
        </div>
        <span className="text-[13px] text-fg-muted sm:hidden">Year {YEAR}</span>
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          disabled={!student}
          aria-label="Open profile"
          className={`${secondaryButton} ml-auto`}
        >
          <span className="sm:hidden">Profile</span>
          <span className="hidden sm:inline">Profile</span>
        </button>
      </header>

      <main
        className={
          workspaceOpen
            ? "flex flex-1 justify-center px-4 pb-16 pt-6 sm:px-6 sm:pt-8"
            : "flex flex-1 items-center justify-center px-4 pb-16 pt-8 sm:px-6"
        }
      >
        <div className="flex w-full max-w-4xl flex-col">
          <div className={workspaceOpen ? "hidden" : "mx-auto mb-8 max-w-3xl text-center sm:mb-10"}>
            <h1 className="text-[38px] leading-[1.05] font-semibold tracking-[-0.04em] text-fg sm:text-[52px]">
              What should your week look like?
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-fg-muted sm:text-[18px]">
              Describe the hours you want free, the days you want on campus and the subjects you like. I’ll find legal course
              combinations that fit.
            </p>
          </div>

          <ChatConversation
            student={chatStudent}
            preferences={preferences}
            onPreferencesChange={applyPreferences}
            onApplied={revealResult}
            variant={workspaceOpen ? "docked" : "hero"}
            initialMessage={returning ? "Loaded your saved week." : undefined}
          />

          <p className={workspaceOpen ? "hidden" : "mx-auto mt-5 max-w-xl text-center text-[13px] text-fg-muted"}>
            Try “No 9am starts, Fridays free, and I’d like machine learning.”
          </p>

          {workspaceOpen && (
            <section ref={resultPanel} aria-label="Plans" className="mx-auto mt-10 w-full max-w-5xl sm:mt-12">
              <PlannerWorkspace
                solutions={solve.solutions}
                courses={data?.courses ?? []}
                slots={data?.slots ?? []}
                current={current}
                selected={selected}
                onSelect={(index) => setSelection({ of: solve.solutions, index })}
                semester={semester}
                onSemesterChange={setSemester}
                status={planStatus}
                message={planMessage}
                onRetry={solve.solveNow}
              />
            </section>
          )}
        </div>
      </main>

      {profileOpen && student && yearDefaults && (
        <Sheet title="Your profile" onClose={closeProfile}>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={exportProfile} className={secondaryButton}>
              Export profile
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} className={secondaryButton}>
              Import profile
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              aria-label="Import profile file"
              className="hidden"
              onChange={(event) => {
                void importProfile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {profileNote && <span className="text-[13px] text-fg-muted">{profileNote}</span>}
          </div>
          <DegreePanel
            key={panelKey}
            initialProgrammeCode={student.programmeCode}
            initialYear={student.year}
            initialPassed={student.passed}
            initialBackground={student.background}
            yearDefaults={yearDefaults}
            onChange={setEdited}
          />
          <RuleConfirm
            key={`rules-${student.programmeCode}-${student.year}`}
            programmeCode={student.programmeCode}
            year={student.year}
            student={student}
            onConfirm={confirmRules}
          />
        </Sheet>
      )}
    </div>
  );
}
