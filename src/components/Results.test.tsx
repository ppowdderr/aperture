// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Course, Preferences, Slot, Solution } from "../lib/types";
import { Results, fitLabel, togglePreference } from "./Results";
import { emptyPreferences } from "./WeekGrid";
import { forcedKeys, layoutLanes, mergeWeekRanges } from "./WeekView";

afterEach(cleanup);

const course = (code: string, title: string, semester: Course["semester"] = 1): Course => ({
  code, title, credits: 20, level: 10, semester, school: "Informatics", prerequisitesText: "", drpsUrl: "",
});
const slot = (course: string, day: Slot["day"], start: number, end: number, extra: Partial<Slot> = {}): Slot => ({
  course, activity: "Lecture", semester: 1, day, start, end, weeks: [1, 2, 3], room: "AT 2.12", campus: "central", ...extra,
});
const courses = [course("INFR10067", "Computer Security"), course("INFR10065", "Compiling Techniques", 2)];
const solution = (over: Partial<Solution> = {}): Solution => ({
  courses: ["INFR10065", "INFR10067"],
  groups: { "INFR10067:Tutorial": "n02" },
  score: -3,
  violations: ["INFR10067 Computer Security lecture S1 Mon 10:00–11:00 starts before 10:00"],
  reasons: ["INFR10065 chosen from group A", "INFR10067 forced: compulsory", "INFR10067 keyword: security"],
  rulesSatisfied: [],
  ...over,
});

function setup(solutions: Solution[], prefs: Preferences = emptyPreferences()) {
  const onPreferencesChange = vi.fn<(p: Preferences) => void>();
  render(<Results solutions={solutions} courses={courses} preferences={prefs} onPreferencesChange={onPreferencesChange} />);
  return onPreferencesChange;
}

describe("Results", () => {
  it("shows a placeholder with no solutions", () => {
    setup([]);
    expect(screen.getByText(/will appear here/)).toBeTruthy();
  });

  it("lists courses with titles, credits, reasons and the misses", () => {
    setup([solution()]);
    const list = within(screen.getByRole("region", { name: "Courses" }));
    expect(list.getByText("Computer Security")).toBeTruthy();
    expect(list.getByText(/compulsory · keyword: security/)).toBeTruthy();
    expect(list.getByText(/group A$/)).toBeTruthy();
    expect(list.getByText(/20 cr · S2/)).toBeTruthy();
    expect(screen.getByRole("region", { name: "Courses" }).querySelector("h3")?.textContent).toBe("2 courses · 20 / 20 credits");
    expect(screen.getByText(/starts before 10:00/)).toBeTruthy();
    expect(screen.getByText("score -3")).toBeTruthy();
  });

  it("pin and exclude call back with updated preferences, never both for one course", () => {
    const onChange = setup([solution()]);
    fireEvent.click(screen.getByRole("button", { name: "Pin INFR10067" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ pinned: ["INFR10067"], excluded: [] }));
    fireEvent.click(screen.getByRole("button", { name: "Exclude INFR10065" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ pinned: [], excluded: ["INFR10065"] }));
    cleanup();
    setup([solution()], { ...emptyPreferences(), pinned: ["INFR10067"] });
    const pinned = screen.getByRole("button", { name: "Unpin INFR10067" });
    expect(pinned.getAttribute("aria-pressed")).toBe("true");
    expect(togglePreference({ ...emptyPreferences(), pinned: ["X"] }, "X", "excluded")).toMatchObject({ pinned: [], excluded: ["X"] });
  });

  it("never says fits while anything is violated", () => {
    expect(fitLabel(solution({ violations: [] }))).toBe("fits");
    expect(fitLabel(solution({ violations: ["Unavoidable: INFR08030 lecture S1 Tue 10:10–11:00 falls in time you kept free"] }))).toBe("1 forced miss");
    expect(fitLabel(solution({ violations: ["a", "b", "Unavoidable: c"] }))).toBe("2 misses · 1 forced");
    setup([solution({ violations: ["Unavoidable: INFR08030 lecture S1 Tue 10:10–11:00 falls in time you kept free"] })]);
    expect(screen.getAllByRole("tab")[0].textContent).toContain("1 forced");
    expect(fitLabel(solution({ violations: ["a", "b", "Unavoidable: c"] }), true)).toBe("2 + 1 forced");
    expect(screen.getByText("Only forced misses")).toBeTruthy();
    expect(screen.getByText(/INFR08030 lecture S1 Tue 10:10–11:00/)).toBeTruthy();
  });

  it("lane layout and week-range merging are pure helpers", () => {
    const a = slot("INFR10067", 0, 600, 660, { weeks: [1, 2], room: "A" });
    const b = slot("INFR10067", 0, 600, 660, { weeks: [3, 4, 5], room: "B" });
    const merged = mergeWeekRanges([a, b, slot("INFR10067", 0, 600, 660, { weeks: [6], activity: "Tutorial", group: "n01" })]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ weeks: [1, 2, 3, 4, 5], room: "A / B" });
    const laid = layoutLanes([slot("INFR10065", 0, 720, 780), slot("INFR10065", 0, 630, 690), a]);
    expect(laid.map((l) => [l.slot.start, l.lane, l.lanes])).toEqual([[600, 0, 2], [630, 1, 2], [720, 0, 1]]);
    expect(forcedKeys(["Unavoidable: INFR09051 Informatics Large Practical lecture S1 Fri 09:00–09:50 falls in time you kept free", "plain miss"])).toEqual(
      new Set(["INFR09051|1|4|540"]),
    );
  });

  it("switches plans with the tabs", () => {
    setup([solution(), solution({ courses: ["INFR10065"], violations: [], reasons: ["INFR10065 pinned by you"] })]);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].textContent).toContain("fits");
    fireEvent.click(tabs[1]);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("1 courses", { exact: false })).toBeTruthy();
    expect(screen.getByText("Fits everything you asked for")).toBeTruthy();
  });

});
