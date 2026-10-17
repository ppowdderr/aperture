"use client";

import { useId, type KeyboardEvent } from "react";
import { chosenSlots } from "../lib/solver/score";
import type { Course, Slot, Solution } from "../lib/types";
import type { SolveStatus } from "../lib/use-solve";
import { RulesLedger } from "./RulesLedger";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { fitLabel, splitViolations, tintFor } from "./Results";
import { forcedKeys } from "./WeekView";

const SEMESTER_LABEL = { 1: "S1", 2: "S2", full: "S1+2" } as const;

interface PlannerWorkspaceProps {
  solutions: Solution[];
  courses: readonly Course[];
  slots: readonly Slot[];
  current: Solution | undefined;
  selected: number;
  onSelect: (index: number) => void;
  semester: 1 | 2;
  onSemesterChange: (semester: 1 | 2) => void;
  status: SolveStatus;
  message?: string;
  onRetry?: () => void;
}

export function PlannerWorkspace({
  solutions,
  courses,
  slots,
  current,
  selected,
  onSelect,
  semester,
  onSemesterChange,
  status,
  message,
  onRetry,
}: PlannerWorkspaceProps) {
  const panelId = useId();
  const byCode = new Map(courses.map((course) => [course.code, course]));
  const attended = current ? chosenSlots(current.courses, current.groups, slots) : [];
  const forced = current ? forcedKeys(current.violations) : new Set<string>();
  const rules = current?.rulesSatisfied ?? [];
  const misses = current ? splitViolations(current.violations) : { misses: [], unavoidable: [] };
  const credits = current?.courses.reduce((total, code) => total + (byCode.get(code)?.credits ?? 0), 0) ?? 0;

  if (status === "loading" || status === "idle") {
    return (
      <div aria-live="polite" className="flex min-h-72 items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-5 h-1.5 w-32 overflow-hidden rounded-full bg-panel-2" aria-hidden>
            <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
          </div>
          <p className="text-[16px] font-medium text-fg">Finding legal options…</p>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex min-h-64 items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <p className="text-[18px] font-semibold text-fg">
            {status === "error" ? "The planner couldn't finish that search." : "No legal year fits those constraints."}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
            {message ?? "Describe a looser week in the chat to open up more options."}
          </p>
          {onRetry && status === "error" && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 min-h-10 rounded-md border border-line-strong px-3 text-[14px] font-medium text-fg hover:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  function changePlan(event: KeyboardEvent<HTMLElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? solutions.length - 1
          : event.key === "ArrowLeft"
            ? (index - 1 + solutions.length) % solutions.length
            : (index + 1) % solutions.length;
    onSelect(next);
    event.currentTarget.querySelectorAll<HTMLElement>("[data-option]")[next]?.focus();
  }

  return (
    <div id={panelId} className="mx-auto w-full">
      {solutions.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3">
          <span className="text-[13px] text-fg-muted">Option</span>
          <div role="tablist" aria-label="Plan options" className="flex gap-4">
            {solutions.map((solution, index) => (
              <button
                key={index}
                data-option
                type="button"
                role="tab"
                aria-selected={selected === index}
                aria-controls={panelId}
                tabIndex={selected === index ? 0 : -1}
                onClick={() => onSelect(index)}
                onKeyDown={(event) => changePlan(event, index)}
                className={`min-h-8 border-b-2 text-[14px] font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  selected === index
                    ? "border-accent text-fg"
                    : "border-transparent text-fg-muted hover:text-fg"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[13px] text-fg-muted">{fitLabel(current, true)}</span>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[24px] font-semibold tracking-tight text-fg">Your timetable</h2>
          <p className="mt-1 text-[14px] text-fg-muted">
            {current.courses.length} {current.courses.length === 1 ? "course" : "courses"} · {credits} credits · {fitLabel(current)}
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Semester"
          className="flex gap-4 border-b border-line"
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const next = semester === 1 ? 2 : 1;
            onSemesterChange(next);
            event.currentTarget.querySelectorAll<HTMLElement>("[role='tab']")[next - 1]?.focus();
          }}
        >
          {([1, 2] as const).map((value) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={semester === value}
              aria-controls={panelId}
              tabIndex={semester === value ? 0 : -1}
              onClick={() => onSemesterChange(value)}
              className={`min-h-9 border-b-2 text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                semester === value ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              Semester {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <ScheduleCalendar
          semester={semester}
          slots={attended}
          courses={courses}
          tintOf={tintFor(current)}
          forced={forced}
        />
      </div>

      <details className="mt-4 border-t border-line">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[14px] font-medium text-fg-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
          <span>Plan details</span>
          <span>{current.courses.length} courses · {rules.length} rules</span>
        </summary>
        <div className="pb-4">
          {(misses.misses.length > 0 || misses.unavoidable.length > 0) && (
            <ul className="mb-5 space-y-1.5 text-[13px] leading-relaxed text-fg-muted">
              {[...misses.misses, ...misses.unavoidable].map((miss) => (
                <li key={miss}>{miss}</li>
              ))}
            </ul>
          )}
          <ul className="mb-5 divide-y divide-line border-y border-line">
            {current.courses.map((code) => {
              const course = byCode.get(code);
              return (
                <li key={code} className="flex items-center justify-between gap-4 py-2.5 text-[14px]">
                  <span className="min-w-0 truncate text-fg">{course?.title ?? code}</span>
                  <span className="shrink-0 text-fg-muted">
                    {code} · {course ? `${course.credits} cr · ${SEMESTER_LABEL[course.semester]}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          <RulesLedger rules={rules} />
        </div>
      </details>
    </div>
  );
}
