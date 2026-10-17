// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Course, Slot } from "../lib/types";
import { ScheduleCalendar } from "./ScheduleCalendar";

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
    drpsUrl: "https://example.com",
  },
  {
    code: "INFR10065",
    title: "Compiling Techniques",
    credits: 20,
    level: 10,
    semester: 2,
    school: "Informatics",
    prerequisitesText: "",
    drpsUrl: "https://example.com",
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
    weeks: [2, 3, 4],
    room: "Appleton Tower 2.12",
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

describe("ScheduleCalendar", () => {
  it("shows only the selected semester with a complete accessible class label", () => {
    render(<ScheduleCalendar semester={1} slots={slots} courses={courses} tintOf={() => "#cfe2ff"} />);

    expect(screen.getByText("INFR10067")).toBeTruthy();
    expect(screen.getByText("Computer Security")).toBeTruthy();
    expect(screen.queryByText("INFR10065")).toBeNull();
    expect(
      screen.getByLabelText(
        "INFR10067 Computer Security, Lecture, Monday 09:00–10:00, Appleton Tower 2.12, Central, weeks 2–4",
      ),
    ).toBeTruthy();
  });

  it("states plainly when the chosen semester has no classes", () => {
    render(<ScheduleCalendar semester={2} slots={[]} courses={courses} tintOf={() => "#cfe2ff"} />);
    expect(screen.getByText("No classes in semester 2.")).toBeTruthy();
  });
});
