// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Course, Slot, Solution } from "../lib/types";
import { PlannerWorkspace } from "./PlannerWorkspace";

afterEach(cleanup);

const courses: Course[] = [
  {
    code: "INFR10067",
    title: "Computer Security",
    credits: 20,
    level: 10,
    semester: 1,
    school: "Informatics",
    prerequisitesText: "",
    drpsUrl: "https://example.com/security",
  },
  {
    code: "INFR10065",
    title: "Compiling Techniques",
    credits: 20,
    level: 10,
    semester: 2,
    school: "Informatics",
    prerequisitesText: "",
    drpsUrl: "https://example.com/compilers",
  },
];

const slots: Slot[] = [
  {
    course: "INFR10067",
    activity: "Lecture",
    semester: 1,
    day: 0,
    start: 540,
    end: 600,
    weeks: [1, 2, 3],
    room: "AT 2.12",
    campus: "central",
  },
  {
    course: "INFR10065",
    activity: "Lecture",
    semester: 2,
    day: 2,
    start: 660,
    end: 720,
    weeks: [1, 2, 3],
    room: "JCMB 3217",
    campus: "kb",
  },
];

const solutions: Solution[] = [
  {
    courses: ["INFR10067"],
    groups: {},
    score: 0,
    violations: [],
    reasons: ["INFR10067 forced: compulsory"],
    rulesSatisfied: [
      {
        kind: "compulsory",
        course: "INFR10067",
        source: "INFR10067 is compulsory.",
        url: "https://example.com/security",
      },
      {
        kind: "creditRange",
        group: "A",
        min: 20,
        max: 40,
        source: "Choose 20 to 40 credits.",
        url: "https://example.com/group-a",
      },
    ],
  },
  {
    courses: ["INFR10065"],
    groups: {},
    score: -5,
    violations: ["INFR10065 lecture S2 Wed 11:00–12:00 falls in time you kept free"],
    reasons: ["INFR10065 chosen from group A"],
    rulesSatisfied: [],
  },
];

function setup(overrides: Partial<React.ComponentProps<typeof PlannerWorkspace>> = {}) {
  const onSelect = vi.fn();
  const onSemesterChange = vi.fn();
  const props: React.ComponentProps<typeof PlannerWorkspace> = {
    solutions,
    courses,
    slots,
    current: solutions[0],
    selected: 0,
    onSelect,
    semester: 1,
    onSemesterChange,
    status: "ready",
    ...overrides,
  };
  const rendered = render(<PlannerWorkspace {...props} />);
  return { ...rendered, props, onSelect, onSemesterChange };
}

describe("PlannerWorkspace", () => {
  it("switches plans and semesters from labelled controls", () => {
    const { onSelect, onSemesterChange } = setup();
    fireEvent.click(screen.getByRole("tab", { name: "2" }));
    expect(onSelect).toHaveBeenCalledWith(1);
    fireEvent.keyDown(screen.getByRole("tablist", { name: "Plan options" }), { key: "ArrowRight" });
    expect(onSelect).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole("tab", { name: "Semester 2" }));
    expect(onSemesterChange).toHaveBeenCalledWith(2);
    fireEvent.keyDown(screen.getByRole("tablist", { name: "Semester" }), { key: "ArrowLeft" });
    expect(onSemesterChange).toHaveBeenLastCalledWith(2);
  });

  it("shows course and rule details for the selected plan on demand", () => {
    setup();
    expect(
      screen.getByText((_, element) => element?.tagName === "P" && element.textContent?.includes("1 course · 20 credits") === true),
    ).toBeTruthy();
    const details = screen.getByText("Plan details").closest("details")!;
    fireEvent.click(screen.getByText("Plan details"));
    expect(within(details).getByText("Computer Security")).toBeTruthy();
    expect(within(details).getAllByText(/2 rules/i).length).toBeGreaterThan(0);
  });

  it("hides a previous plan while the next solve is pending", () => {
    setup({ status: "loading" });
    expect(screen.getByText("Finding legal options…")).toBeTruthy();
    expect(screen.queryByText("Computer Security")).toBeNull();
    expect(screen.queryByRole("tab", { name: "1" })).toBeNull();
  });

  it("explains an empty result and directs the student back to chat", () => {
    setup({ status: "empty", current: undefined });
    const emptyMessages = screen.getAllByText(/No legal year fits those constraints/);
    expect(emptyMessages.length).toBeGreaterThan(0);
    expect(screen.getByText("Describe a looser week in the chat to open up more options.")).toBeTruthy();
  });
});
