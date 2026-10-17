// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Course, Preferences, Slot, Solution } from "../lib/types";
import { Results, fitLabel, togglePreference } from "./Results";
import { emptyPreferences } from "./WeekGrid";
import { layoutLanes, mergeWeekRanges } from "./WeekView";

afterEach(cleanup);

const course = (code: string, title: string, semester: Course["semester"] = 1): Course => ({
  code, title, credits: 20, level: 10, semester, school: "Informatics", prerequisitesText: "", drpsUrl: "",
});
const slot = (course: string, day: Slot["day"], start: number, end: number, extra: Partial<Slot> = {}): Slot => ({
  course, activity: "Lecture", semester: 1, day, start, end, weeks: [1, 2, 3], room: "AT 2.12", campus: "central", ...extra,
});
const courses = [course("INFR10067", "Computer Security"), course("INFR10065", "Compiling Techniques", 2)];
const slots = [
  slot("INFR10067", 0, 600, 660),
  slot("INFR10067", 1, 540, 600, { activity: "Tutorial", group: "n01" }),
  slot("INFR10067", 1, 660, 720, { activity: "Tutorial", group: "n02" }),
  slot("INFR10065", 2, 600, 660, { semester: 2 }),
];
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
  render(<Results solutions={solutions} courses={courses} slots={slots} preferences={prefs} onPreferencesChange={onPreferencesChange} />);
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
    expect(list.getByText("compulsory · keyword: security")).toBeTruthy();
    expect(list.getByText("group A")).toBeTruthy();
    expect(list.getByText("20 cr · S2")).toBeTruthy();
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

  it("draws only the chosen tutorial group in the week views", () => {
    setup([solution()]);
    const s1 = screen.getByRole("group", { name: "Semester 1 timetable" });
    const cells = [...s1.querySelectorAll("[title]")].map((el) => el.getAttribute("title"));
    expect(cells).toHaveLength(2);
    expect(cells.join("\n")).toContain("Tutorial n02");
    expect(cells.join("\n")).not.toContain("Tutorial n01");
    expect(cells.join("\n")).toContain("AT 2.12 · Central");
    const s2 = screen.getByRole("group", { name: "Semester 2 timetable" });
    expect(s2.querySelectorAll("[title]")).toHaveLength(1);
  });

  it("never says fits while anything is violated", () => {
    expect(fitLabel(solution({ violations: [] }))).toBe("fits");
    expect(fitLabel(solution({ violations: ["Unavoidable: INFR08030 lecture S1 Tue 10:10–11:00 falls in time you kept free"] }))).toBe("1 unavoidable");
    expect(fitLabel(solution({ violations: ["a", "b", "Unavoidable: c"] }))).toBe("2 misses · 1 unavoidable");
    setup([solution({ violations: ["Unavoidable: INFR08030 lecture S1 Tue 10:10–11:00 falls in time you kept free"] })]);
    expect(screen.getAllByRole("tab")[0].textContent).toContain("1 unavoidable");
    expect(screen.getByText("Nothing you can change misses")).toBeTruthy();
    expect(screen.getByText(/INFR08030 lecture S1 Tue 10:10–11:00/)).toBeTruthy();
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

  it("merges the same slot taught over several week ranges into one cell", () => {
    const a = slot("INFR10067", 0, 600, 660, { weeks: [1, 2], room: "A" });
    const b = slot("INFR10067", 0, 600, 660, { weeks: [3, 4, 5], room: "B" });
    const c = slot("INFR10067", 0, 600, 660, { weeks: [6], activity: "Tutorial", group: "n01" });
    const merged = mergeWeekRanges([a, b, c]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ weeks: [1, 2, 3, 4, 5], room: "A / B" });
    cleanup();
    render(<Results solutions={[solution({ groups: {} })]} courses={courses} slots={[a, b]} preferences={emptyPreferences()} onPreferencesChange={vi.fn()} />);
    const cells = screen.getByRole("group", { name: "Semester 1 timetable" }).querySelectorAll("[data-lanes]");
    expect(cells).toHaveLength(1);
    expect(cells[0].getAttribute("title")).toContain("weeks 1–5");
  });

  it("never draws clashing cells on top of each other: overlapping slots share the column", () => {
    const a = slot("INFR10067", 0, 600, 660);
    const b = slot("INFR10065", 0, 630, 690);
    const c = slot("INFR10065", 0, 720, 780);
    const laid = layoutLanes([c, b, a]);
    expect(laid.map((l) => [l.slot.start, l.lane, l.lanes])).toEqual([[600, 0, 2], [630, 1, 2], [720, 0, 1]]);
    setup([solution({ courses: ["INFR10065", "INFR10067"], groups: {} })]);
    cleanup();
    const onChange = vi.fn();
    render(
      <Results
        solutions={[solution({ groups: {} })]}
        courses={courses}
        slots={[a, b]}
        preferences={emptyPreferences()}
        onPreferencesChange={onChange}
      />,
    );
    const cells = [...screen.getByRole("group", { name: "Semester 1 timetable" }).querySelectorAll("[data-lanes]")];
    expect(cells.map((el) => el.getAttribute("data-lanes"))).toEqual(["2", "2"]);
    expect(new Set(cells.map((el) => el.getAttribute("data-lane"))).size).toBe(2);
  });
});
