"use client";

import { useEffect, useId, useState } from "react";
import { z } from "zod";
import { courseListSchema } from "../lib/schemas";
import type { Course, ProgrammeYear, StudentState } from "../lib/types";

const programmeListSchema = z.array(
  z
    .object({
      programmeCode: z.string().regex(/^[A-Z0-9]+$/),
      programmeTitle: z.string().min(1),
    })
    .strict(),
);

type ProgrammeOption = z.infer<typeof programmeListSchema>[number];

export interface DegreePanelProps {
  initialProgrammeCode?: string;
  initialYear?: ProgrammeYear["year"];
  initialPassed?: string[];
  initialBackground?: Record<string, string>;
  /** Passed courses to pre-tick per year (typically every earlier year's compulsory courses); applied when the year changes. */
  yearDefaults?: Partial<Record<ProgrammeYear["year"], string[]>>;
  onChange?: (student: StudentState) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function DegreePanel({
  initialProgrammeCode = "UTCMPSI",
  initialYear = 3,
  initialPassed = [],
  initialBackground = {},
  yearDefaults,
  onChange,
}: DegreePanelProps) {
  const searchId = useId();
  const mathsId = useId();
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [programmeCode, setProgrammeCode] = useState(initialProgrammeCode);
  const [year, setYear] = useState<ProgrammeYear["year"]>(initialYear);
  const [courses, setCourses] = useState<Course[]>([]);
  const [passed, setPassed] = useState<Set<string>>(new Set(initialPassed));
  const [background, setBackground] = useState(initialBackground);
  const [query, setQuery] = useState("");
  const [programmeError, setProgrammeError] = useState<string | null>(null);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);

  function emit(
    next: Partial<Pick<StudentState, "programmeCode" | "year" | "passed" | "background">>,
  ): void {
    onChange?.({
      programmeCode: next.programmeCode ?? programmeCode,
      year: next.year ?? year,
      passed: next.passed ?? [...passed].sort(),
      background: next.background ?? background,
    });
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadProgrammes(): Promise<void> {
      setProgrammeError(null);
      try {
        const response = await fetch("/api/programmes", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Programme API returned ${response.status}`);
        }
        const parsed = programmeListSchema.safeParse(await response.json());
        if (!parsed.success) {
          throw new Error("Programme API returned invalid data");
        }

        setProgrammes(parsed.data);
        const selected =
          parsed.data.find((item) => item.programmeCode === programmeCode) ??
          parsed.data[0];
        if (selected) setProgrammeCode(selected.programmeCode);
      } catch (error) {
        if (controller.signal.aborted) return;
        setProgrammeError(
          `Could not load programmes: ${errorMessage(error)}. Year and background still work.`,
        );
      }
    }

    void loadProgrammes();
    return () => controller.abort();
  }, [programmeCode]);

  useEffect(() => {
    if (!programmeCode) return;
    const controller = new AbortController();

    async function loadCourses(): Promise<void> {
      setLoadingCourses(true);
      setCourseError(null);
      try {
        const response = await fetch(
          `/api/courses?programme=${encodeURIComponent(programmeCode)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Course API returned ${response.status}`);
        }
        const parsed = courseListSchema.safeParse(await response.json());
        if (!parsed.success) {
          throw new Error("Course API returned invalid data");
        }

        setCourses(parsed.data);
        const available = new Set(parsed.data.map((course) => course.code));
        setPassed((current) => {
          const next = new Set([...current].filter((code) => available.has(code)));
          return next.size === current.size ? current : next;
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setCourses([]);
        setCourseError(
          `Could not load courses: ${errorMessage(error)}. Your other choices are unchanged.`,
        );
      } finally {
        if (!controller.signal.aborted) setLoadingCourses(false);
      }
    }

    void loadCourses();
    return () => controller.abort();
  }, [programmeCode]);

  const normalisedQuery = query.trim().toLowerCase();
  const visibleCourses = normalisedQuery
    ? courses.filter(
        (course) =>
          course.code.toLowerCase().includes(normalisedQuery) ||
          course.title.toLowerCase().includes(normalisedQuery),
      )
    : courses;

  const passedCourses = courses.filter((course) => passed.has(course.code));
  const passedCredits = passedCourses.reduce(
    (total, course) => total + course.credits,
    0,
  );

  function changeProgramme(nextCode: string): void {
    if (nextCode === programmeCode) return;
    const nextPassed = new Set<string>();
    setProgrammeCode(nextCode);
    setPassed(nextPassed);
    setQuery("");
    emit({ programmeCode: nextCode, passed: [] });
  }

  function changeYear(nextYear: ProgrammeYear["year"]): void {
    setYear(nextYear);
    const defaults = yearDefaults?.[nextYear];
    if (defaults) {
      const next = new Set(defaults);
      setPassed(next);
      emit({ year: nextYear, passed: [...next].sort() });
      return;
    }
    emit({ year: nextYear });
  }

  function toggleCourse(code: string): void {
    const next = new Set(passed);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setPassed(next);
    emit({ passed: [...next].sort() });
  }

  function changeBackground(value: string): void {
    const next = { ...background };
    if (value.trim()) next.maths = value;
    else delete next.maths;
    setBackground(next);
    emit({ background: next });
  }

  return (
    <div className="flex max-h-[18rem] flex-col gap-3">
      {(programmeError || courseError) && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-100"
        >
          {[programmeError, courseError].filter(Boolean).join(" ")}
        </div>
      )}

      <div className="grid grid-cols-[minmax(260px,1fr)_7rem_11rem] items-end gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-[13px] text-fg-faint">
          Programme
          <select
            value={programmeCode}
            onChange={(event) => changeProgramme(event.target.value)}
            className="h-9 min-w-0 rounded-md border border-line bg-panel-2 px-2 text-[15px] text-fg"
          >
            {programmes.length === 0 && (
              <option value={programmeCode}>{programmeCode}</option>
            )}
            {programmes.map((programme) => (
              <option key={programme.programmeCode} value={programme.programmeCode}>
                {programme.programmeTitle} ({programme.programmeCode})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[13px] text-fg-faint">
          Year
          <select
            aria-label="Year"
            value={year}
            onChange={(event) =>
              changeYear(Number(event.target.value) as ProgrammeYear["year"])
            }
            className="h-9 rounded-md border border-line bg-panel-2 px-2 text-[15px] text-fg"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                Year {value}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="text-[13px] text-fg-faint">Passed</div>
          <div className="text-[17px]">
            {passedCourses.length}{" "}
            {passedCourses.length === 1 ? "course" : "courses"} ·{" "}
            {passedCredits} credits
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_15rem] gap-3">
        <div className="flex min-h-0 flex-col gap-2">
          <label
            htmlFor={searchId}
            className="text-[13px] text-fg-faint"
          >
            Passed courses
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search code or course title"
            className="h-9 shrink-0 rounded-md border border-line bg-panel-2 px-3 placeholder:text-fg-faint"
          />
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-line bg-panel-2">
            {loadingCourses ? (
              <p className="px-3 py-2 text-fg-faint">Loading courses…</p>
            ) : visibleCourses.length === 0 ? (
              <p className="px-3 py-2 text-fg-faint">No matching courses.</p>
            ) : (
              <ul className="divide-y divide-line">
                {visibleCourses.map((course) => (
                  <li key={course.code}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={passed.has(course.code)}
                        onChange={() => toggleCourse(course.code)}
                        className="mt-1 accent-[var(--color-accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] text-fg">
                          {course.title}
                        </span>
                        <span className="block font-mono text-[12px] text-fg-faint">
                          {course.code} · {course.credits} credits · semester{" "}
                          {course.semester}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <label
          htmlFor={mathsId}
          className="flex flex-col gap-1 text-[13px] text-fg-faint"
        >
          Maths qualification
          <input
            id={mathsId}
            value={background.maths ?? ""}
            onChange={(event) => changeBackground(event.target.value)}
            placeholder="e.g. A-level A*"
            className="h-9 rounded-md border border-line bg-panel-2 px-2 text-[15px] text-fg placeholder:text-fg-faint"
          />
          <span className="text-[12px] leading-snug text-fg-faint">
            Used only when a conditional DRPS rule needs it.
          </span>
        </label>
      </div>
    </div>
  );
}
