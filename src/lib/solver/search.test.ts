import { describe, expect, it } from "vitest";
import { loadCourses, loadProgramme } from "../data";
import type { Course, ProgrammeYear, Slot, StudentState } from "../types";
import {
  parsePrerequisites,
  prereqSatisfied,
  resolveGroups,
  scheduleLevels,
  searchLegalYears,
} from "./search";

function course(code: string, credits: number, semester: Course["semester"], extra: Partial<Course> = {}): Course {
  return {
    code,
    title: code,
    credits,
    level: Number(code.slice(4, 6)),
    semester,
    school: "Informatics",
    prerequisitesText: "",
    drpsUrl: `https://www.drps.ed.ac.uk/26-27/dpt/cx${code.toLowerCase()}.htm`,
    ...extra,
  };
}

// Year: 2 compulsory (40 cr), group A exactly 60 from four 20s, group B 0-20 from two 20s.
const courses: Course[] = [
  course("INFR10001", 20, 1),
  course("INFR10002", 20, 2),
  course("INFR10011", 20, 1),
  course("INFR10012", 20, 2),
  course("INFR10013", 20, 1),
  course("INFR10014", 20, 2),
  course("INFR10021", 20, 1),
  course("INFR10022", 20, 2, { prerequisitesText: "Students MUST have passed: Thing (INFR09099)" }),
  course("INFR09099", 20, 1),
];
const programme: ProgrammeYear = {
  programmeCode: "TEST",
  programmeTitle: "Test",
  year: 3,
  compulsory: ["INFR10001", "INFR10002"],
  groups: [
    { id: "A", title: "A", minCredits: 60, maxCredits: 60, courses: ["INFR10011", "INFR10012", "INFR10013", "INFR10014"], notesText: "" },
    { id: "B", title: "B", minCredits: 0, maxCredits: 20, courses: ["INFR10021", "INFR10022"], notesText: "" },
  ],
  notesText: "",
  drpsUrl: "",
};
const student = (passed: string[] = []): StudentState => ({ programmeCode: "TEST", year: 3, passed, background: {} });

function fixedSlot(code: string, start: number): Slot {
  return {
    course: code,
    activity: "Lecture",
    semester: 1,
    day: 0,
    start,
    end: start + 60,
    weeks: [1],
    room: "Test",
    campus: "central",
  };
}

describe("searchLegalYears", () => {
  it("forces compulsory courses, totals 120 credits and keeps every group in range", () => {
    const out = searchLegalYears({ programme, courses, student: student() });
    expect(out.length).toBeGreaterThan(0);
    for (const y of out) {
      expect(y.courses).toContain("INFR10001");
      expect(y.courses).toContain("INFR10002");
      expect(y.credits).toBe(120);
      const inA = y.courses.filter((c) => c.startsWith("INFR1001")).length;
      const inB = y.courses.filter((c) => c.startsWith("INFR1002")).length;
      expect(inA).toBe(3);
      expect(inB).toBeLessThanOrEqual(1);
      expect(y.reasons).toContain("INFR10001 forced: compulsory");
    }
  });

  it("keeps each semester between 40 and 80 credits", () => {
    const out = searchLegalYears({ programme, courses, student: student() });
    for (const y of out) for (const s of y.semesterCredits) expect(s).toBeGreaterThanOrEqual(40);
    // 3 of the 4 group-A courses + 2 compulsory + INFR10021: sem 1 would be 100 with 11,13,21 → pruned
    expect(out.some((y) => y.semesterCredits[0] === 100)).toBe(false);
  });

  it("returns [] when the programme is infeasible", () => {
    const tooFew = { ...programme, groups: [{ ...programme.groups[0], minCredits: 100, maxCredits: 100 }] };
    expect(searchLegalYears({ programme: tooFew, courses, student: student() })).toEqual([]);
    expect(searchLegalYears({ programme, courses, student: student(), excluded: ["INFR10001"] })).toEqual([]);
  });

  it("honours pinned and excluded", () => {
    const out = searchLegalYears({ programme, courses, student: student(), pinned: ["INFR10013"], excluded: ["INFR10011"] });
    expect(out.length).toBeGreaterThan(0);
    for (const y of out) {
      expect(y.courses).toContain("INFR10013");
      expect(y.courses).not.toContain("INFR10011");
    }
    expect(out[0].reasons).toContain("INFR10013 pinned by you");
  });

  it("drops courses whose hard prerequisite is not passed", () => {
    const without = searchLegalYears({ programme, courses, student: student() });
    expect(without.every((y) => !y.courses.includes("INFR10022"))).toBe(true);
    const withIt = searchLegalYears({ programme, courses, student: student(["INFR09099"]) });
    expect(withIt.some((y) => y.courses.includes("INFR10022"))).toBe(true);
  });

  it("respects the result cap", () => {
    expect(searchLegalYears({ programme, courses, student: student(), cap: 2 })).toHaveLength(2);
  });

  it("skips an early fixed-lecture clash instead of spending the cap on it", () => {
    const out = searchLegalYears({
      programme,
      courses,
      student: student(),
      cap: 1,
      slots: [
        fixedSlot("INFR10011", 9 * 60),
        fixedSlot("INFR10013", 9 * 60),
      ],
    });

    expect(out).toHaveLength(1);
    expect(out[0].courses).not.toContain("INFR10013");
  });

  it("keeps a clash between compulsory courses searchable", () => {
    const out = searchLegalYears({
      programme,
      courses,
      student: student(),
      cap: 1,
      slots: [
        fixedSlot("INFR10001", 9 * 60),
        fixedSlot("INFR10002", 9 * 60),
      ],
    });

    expect(out).toHaveLength(1);
    expect(out[0].courses).toEqual(
      expect.arrayContaining(["INFR10001", "INFR10002"]),
    );
  });

  it("filters candidates using a confirmed prerequisite rule", () => {
    const rule = {
      kind: "prerequisite" as const,
      course: "INFR10013",
      requires: ["INFR09099"],
      source: "A confirmed prerequisite sentence.",
      url: "https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm",
    };
    const out = searchLegalYears({
      programme,
      courses,
      student: student(),
      rules: [rule],
    });

    expect(out.length).toBeGreaterThan(0);
    expect(out.every((year) => !year.courses.includes("INFR10013"))).toBe(true);
  });

  it("returns no legal year when a confirmed progression rule is unmet", () => {
    const rule = {
      kind: "mustPassBefore" as const,
      course: "INFR10001",
      year: 3,
      source: "A confirmed progression sentence.",
      url: "https://www.drps.ed.ac.uk/26-27/dpt/utcmpsi.htm",
    };

    expect(
      searchLegalYears({
        programme,
        courses,
        student: student(),
        rules: [rule],
      }),
    ).toEqual([]);
  });
});

describe("parsePrerequisites", () => {
  it("parses AND/OR with brackets, dropping course names", () => {
    const e = parsePrerequisites(
      "Students MUST have passed: ( Informatics 1 - Introduction to Computation (INFR08025) AND Informatics 1 - Object Oriented Programming (INFR08029)) AND ( Introduction to Linear Algebra (MATH08057) OR Linear Algebra 1 (MATH08079))",
    );
    expect(e).toEqual({
      op: "and",
      items: [
        { op: "and", items: [{ op: "course", code: "INFR08025" }, { op: "course", code: "INFR08029" }] },
        { op: "or", items: [{ op: "course", code: "MATH08057" }, { op: "course", code: "MATH08079" }] },
      ],
    });
    const passed = new Set(["INFR08025", "INFR08029", "MATH08079"]);
    expect(prereqSatisfied(e!, passed, new Set())).toBe(true);
    expect(prereqSatisfied(e!, new Set(["INFR08025", "MATH08079"]), new Set())).toBe(false);
  });

  it("ignores RECOMMENDED prose and names with brackets", () => {
    expect(parsePrerequisites("It is RECOMMENDED that students have passed Speech Processing (Hons) (LASC10061)")).toBeNull();
    expect(parsePrerequisites("")).toBeNull();
    const e = parsePrerequisites("Students MUST have passed: A (INFR08026) OR B (INFR08031) It is RECOMMENDED that students have passed C (INFR08020)");
    expect(e).toEqual({ op: "or", items: [{ op: "course", code: "INFR08026" }, { op: "course", code: "INFR08031" }] });
  });

  it("treats codes outside the catalogue as met", () => {
    const e = parsePrerequisites("Students MUST have passed: Old (INFR08025)")!;
    expect(prereqSatisfied(e, new Set(), new Set(["INFR08025"]))).toBe(true);
    expect(prereqSatisfied(e, new Set(), new Set())).toBe(false);
  });
});

describe("resolveGroups", () => {
  it("fills open groups from the catalogue by level, skipping compulsory courses of any year", () => {
    expect(scheduleLevels("Level 7 and 8 courses in Schedules A to T, W and Y")).toEqual([7, 8]);
    expect(scheduleLevels("Level 9 and 10 courses in Schedules A to R, T and W")).toEqual([9, 10]);
    const open: ProgrammeYear = {
      ...programme,
      year: 2,
      compulsory: ["INFR10001"],
      groups: [{ id: "R1", title: "Outside", minCredits: 20, maxCredits: 20, courses: [], schedules: "Level 10 courses", notesText: "" }],
    };
    const [r] = resolveGroups(open, courses, [open, programme]);
    expect(r.members.has("INFR10001")).toBe(false);
    expect(r.members.has("INFR10002")).toBe(false); // compulsory in year 3
    expect(r.members.has("INFR10011")).toBe(true);
  });

  it("drops listed courses missing from the catalogue", () => {
    const [a] = resolveGroups({ ...programme, groups: [{ ...programme.groups[0], courses: ["INFR10011", "PHIL10133"] }] }, courses);
    expect([...a.members]).toEqual(["INFR10011"]);
  });
});

describe("committed UTCMPSI data", () => {
  it("finds legal year-3 sets for a student who passed the earlier compulsory courses, fast", () => {
    const years = loadProgramme("UTCMPSI");
    const all = loadCourses("UTCMPSI");
    const programme = years.find((y) => y.year === 3)!;
    const passed = years.filter((y) => y.year < 3).flatMap((y) => y.compulsory);
    const t0 = performance.now();
    const out = searchLegalYears({ programme, courses: all, allYears: years, student: { programmeCode: "UTCMPSI", year: 3, passed, background: {} } });
    expect(performance.now() - t0).toBeLessThan(100);
    expect(out.length).toBeGreaterThan(0);
    for (const y of out) {
      expect(y.credits).toBe(120);
      for (const c of programme.compulsory) expect(y.courses).toContain(c);
    }
  });
});
