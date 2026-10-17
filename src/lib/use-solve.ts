"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { courseListSchema, programmeYearListSchema, slotListSchema } from "./schemas";
import type { Course, Preferences, ProgrammeYear, Slot, Solution, StudentState } from "./types";

export const PREFERENCES_KEY = "aperture:preferences:v2";
export const SOLVE_DEBOUNCE_MS = 300;

/** Reads saved preferences; anything malformed falls back to `fallback`. */
export function loadPreferences(fallback: Preferences, storage: Storage | undefined = globalThis.localStorage): Preferences {
  try {
    const raw = storage?.getItem(PREFERENCES_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<Preferences>;
    if (!Array.isArray(p.blocks) || !Array.isArray(p.pinned) || !Array.isArray(p.excluded)) return fallback;
    const merged = { ...fallback, ...p };
    for (const k of ["earliestStart", "latestEnd", "maxBackToBackHours", "maxGapHours"] as const) {
      if (merged[k] !== null && typeof merged[k] !== "number") return fallback;
    }
    return merged;
  } catch {
    return fallback;
  }
}

export function savePreferences(prefs: Preferences, storage: Storage | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode / quota: preferences simply don't persist.
  }
}

export interface ProgrammeData {
  years: ProgrammeYear[];
  courses: Course[];
  slots: Slot[];
}

/** Programme table, course catalogue and timetable for one programme, from the data API. */
export function useProgrammeData(programmeCode: string): { data: ProgrammeData | null; error: string | null } {
  const [data, setData] = useState<ProgrammeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const q = encodeURIComponent(programmeCode);
    const get = async (url: string) => {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`${url} returned ${res.status}`);
      return res.json();
    };
    Promise.all([get(`/api/programmes/${q}`), get(`/api/courses?programme=${q}`), get(`/api/slots?programme=${q}`)])
      .then(([years, courses, slots]) => {
        setData({
          years: programmeYearListSchema.parse(years),
          courses: courseListSchema.parse(courses),
          slots: slotListSchema.parse(slots),
        });
        setError(null);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Could not load programme data");
      });
    return () => controller.abort();
  }, [programmeCode]);

  return { data, error };
}

export type SolveStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface SolveState {
  solutions: Solution[];
  status: SolveStatus;
  error: string | null;
  /** Server-side solve time from the `Server-Timing` header, when present. */
  ms: number | null;
  /** The preference object that produced the current request/solutions; null before the first request. */
  solvedFor: Preferences | null;
  /** Skip the debounce and solve now. */
  solveNow: () => void;
}

/**
 * Debounced POST /api/solve whenever `student` or `preferences` change. Only one request is ever
 * in flight: a new change aborts the previous one, so results never arrive out of order.
 */
export function useSolve(student: StudentState | null, preferences: Preferences, count = 3): SolveState {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [status, setStatus] = useState<SolveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [solvedFor, setSolvedFor] = useState<Preferences | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ student, preferences, count });
  useEffect(() => {
    latest.current = { student, preferences, count };
  }, [student, preferences, count]);

  const run = useCallback(async () => {
    const { student, preferences, count } = latest.current;
    if (!student) return;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setSolvedFor(preferences);
    setStatus("loading");
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ programmeCode: student.programmeCode, year: student.year, student, preferences, count }),
      });
      const timing = res.headers.get("Server-Timing")?.match(/dur=(\d+)/);
      const body: unknown = await res.json().catch(() => null);
      if (controller.signal.aborted) return;
      setMs(timing ? Number(timing[1]) : null);
      if (res.status === 422) {
        setSolutions([]);
        setError(null);
        setStatus("empty");
        return;
      }
      if (!res.ok || !Array.isArray(body)) {
        const message = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : `Solve failed (${res.status})`;
        setError(message);
        setStatus("error");
        return;
      }
      setSolutions(body as Solution[]);
      setError(null);
      setStatus("ready");
    } catch (e: unknown) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Solve failed");
      setStatus("error");
    } finally {
      if (inflight.current === controller) inflight.current = null;
    }
  }, []);

  useEffect(() => {
    if (!student) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), SOLVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [student, preferences, count, run]);

  useEffect(() => () => inflight.current?.abort(), []);

  const solveNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    void run();
  }, [run]);

  return { solutions, status, error, ms, solvedFor, solveNow };
}
