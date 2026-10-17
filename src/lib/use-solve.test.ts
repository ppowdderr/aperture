// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Preferences, Solution, StudentState } from "./types";
import { PREFERENCES_KEY, SOLVE_DEBOUNCE_MS, loadPreferences, savePreferences, useSolve } from "./use-solve";

const prefs: Preferences = { blocks: [], earliestStart: null, latestEnd: null, maxBackToBackHours: null, maxGapHours: null, campusDaysTogether: false, wantKeywords: [], pinned: [], excluded: [] };
const student: StudentState = { programmeCode: "UTCMPSI", year: 3, passed: [], background: {} };
const solution: Solution = { courses: ["INFR09051"], groups: {}, score: 0, violations: [], reasons: [], rulesSatisfied: [] };

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useSolve", () => {
  it("coalesces rapid changes into one request after the debounce", async () => {
    fetchMock.mockResolvedValue(jsonResponse([solution], 200, { "Server-Timing": "solve;dur=42" }));
    const { result, rerender } = renderHook(({ p }: { p: Preferences }) => useSolve(student, p), { initialProps: { p: prefs } });
    rerender({ p: { ...prefs, maxGapHours: 2 } });
    rerender({ p: { ...prefs, maxGapHours: 1 } });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(SOLVE_DEBOUNCE_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ programmeCode: "UTCMPSI", year: 3, preferences: { maxGapHours: 1 }, count: 3 });
    await act(async () => {});
    expect(result.current.status).toBe("ready");
    expect(result.current.solutions).toEqual([solution]);
    expect(result.current.ms).toBe(42);
  });

  it("aborts the in-flight request when a new change arrives, so only the latest answer lands", async () => {
    let resolveFirst!: (r: Response) => void;
    fetchMock
      .mockImplementationOnce((_url, init) => {
        const signal = init?.signal;
        return new Promise<Response>((resolve, reject) => {
          resolveFirst = resolve;
          signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        });
      })
      .mockResolvedValueOnce(jsonResponse([solution]));
    const { result, rerender } = renderHook(({ p }: { p: Preferences }) => useSolve(student, p), { initialProps: { p: prefs } });
    await act(async () => {
      vi.advanceTimersByTime(SOLVE_DEBOUNCE_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("loading");
    rerender({ p: { ...prefs, maxGapHours: 1 } });
    await act(async () => {
      vi.advanceTimersByTime(SOLVE_DEBOUNCE_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => {
      resolveFirst(jsonResponse([{ ...solution, courses: ["STALE"] }]));
    });
    expect(result.current.solutions).toEqual([solution]);
    expect(result.current.status).toBe("ready");
  });

  it("reports 422 as empty and other failures as errors; solveNow skips the debounce", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "No legal year", solutions: [] }, 422));
    const { result, rerender } = renderHook(({ p }: { p: Preferences }) => useSolve(student, p), { initialProps: { p: prefs } });
    await act(async () => {
      result.current.solveNow();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("empty");
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Invalid solve request" }, 400));
    rerender({ p: { ...prefs, maxGapHours: 1 } });
    await act(async () => {
      vi.advanceTimersByTime(SOLVE_DEBOUNCE_MS);
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Invalid solve request");
  });

  it("does nothing without a student", async () => {
    renderHook(() => useSolve(null, prefs));
    await act(async () => {
      vi.advanceTimersByTime(SOLVE_DEBOUNCE_MS * 2);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("preferences persistence", () => {
  it("round-trips through localStorage and ignores junk", () => {
    const painted = { ...prefs, blocks: [{ id: "b", day: 4 as const, start: 480, end: 1080, kind: "free" as const }], pinned: ["INFR10067"] };
    savePreferences(painted);
    expect(loadPreferences(prefs)).toEqual(painted);
    localStorage.setItem(PREFERENCES_KEY, "{not json");
    expect(loadPreferences(prefs)).toEqual(prefs);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ blocks: "nope" }));
    expect(loadPreferences(prefs)).toEqual(prefs);
    expect(loadPreferences(prefs, undefined)).toEqual(prefs);
  });
});
