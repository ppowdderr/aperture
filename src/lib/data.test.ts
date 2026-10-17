import { describe, expect, it } from "vitest";
import { loadCourses, loadProgramme, loadSlots } from "./data";

describe("data loaders", () => {
  it("loads and validates the current programme", () => {
    const programme = loadProgramme("UTCMPSI");

    expect(programme).toHaveLength(4);
    expect(programme[0].compulsory).toContain("INFR07003");
  });

  it("loads and validates the current course catalogue", () => {
    const courses = loadCourses("UTCMPSI");

    expect(courses).toHaveLength(68);
    expect(courses.find((course) => course.code === "INFR10086")).toMatchObject({
      credits: 20,
      level: 10,
      semester: 2,
    });
  });

  it("loads validated slots from the fixture", () => {
    expect(loadSlots("SAMPLE")).toEqual([
      {
        course: "INFR10086",
        activity: "Lecture",
        semester: 2,
        day: 0,
        start: 670,
        end: 720,
        weeks: [1, 2],
        room: "Appleton Tower 2.35",
        campus: "central",
      },
    ]);
  });

  it("names a missing data file", () => {
    expect(() => loadProgramme("MISSING")).toThrow(
      "Unable to read data/programme-MISSING.json",
    );
  });
});
