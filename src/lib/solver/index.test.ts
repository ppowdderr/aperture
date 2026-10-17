import { describe, expect, it } from "vitest";
import { loadCourses, loadProgramme, loadSlots } from "../data";
import type { Preferences, StudentState } from "../types";
import { CLASH_PENALTY, MIN_DIFFERENT_COURSES, solve } from "./index";
import { score } from "./score";

const emptyPrefs: Preferences = {
  blocks: [],
  earliestStart: null, latestEnd: null, maxBackToBackHours: null, maxGapHours: null, campusDaysTogether: false,
  wantKeywords: [], pinned: [], excluded: [],
};

const years = loadProgramme("UTCMPSI");
const courses = loadCourses("UTCMPSI");
const slots = loadSlots("UTCMPSI");
const programme = years.find((y) => y.year === 3)!;
const student: StudentState = {
  programmeCode: "UTCMPSI",
  year: 3,
  passed: years.filter((y) => y.year < 3).flatMap((y) => y.compulsory),
  background: {},
};
const base = { programme, courses, slots, student, allYears: years };

describe("solve", () => {
  it("returns an empty array for an empty programme", () => {
    const out = solve({
      programme: { programmeCode: "X", programmeTitle: "X", year: 1, compulsory: [], groups: [], notesText: "", drpsUrl: "" },
      courses: [], slots: [], preferences: emptyPrefs,
      student: { programmeCode: "X", year: 1, passed: [], background: {} },
    });
    expect(out).toEqual([]);
  });

  it("gives three distinct, explained, clash-free year-3 solutions on real data in under a second", () => {
    const t0 = performance.now();
    const out = solve({ ...base, preferences: emptyPrefs });
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(out).toHaveLength(3);
    for (let i = 0; i < out.length; i++) {
      for (let j = 0; j < i; j++) {
        const other = new Set(out[j].courses);
        expect(out[i].courses.filter((c) => !other.has(c)).length).toBeGreaterThanOrEqual(MIN_DIFFERENT_COURSES);
      }
    }
    for (const sol of out) {
      for (const code of sol.courses) expect(sol.reasons.some((r) => r.startsWith(`${code} `))).toBe(true);
      for (const code of programme.compulsory) expect(sol.courses).toContain(code);
      expect(sol.rulesSatisfied.length).toBeGreaterThan(0);
      for (const rule of sol.rulesSatisfied) expect(rule.url).toMatch(/^https:\/\/www\.drps\.ed\.ac\.uk\//);
      expect(Object.keys(sol.groups).length).toBeGreaterThan(0);
      expect(sol.violations.some((v) => v.startsWith("Clash:"))).toBe(false);
    }
    expect(out.map((s) => s.score)).toEqual([...out.map((s) => s.score)].sort((a, b) => b - a));
    expect(solve({ ...base, preferences: emptyPrefs })).toEqual(out);
  });

  it("honours pinned and excluded courses and explains keywords", () => {
    const prefs = { ...emptyPrefs, pinned: ["INFR10067"], excluded: ["INFR10065"], wantKeywords: ["security"] };
    const out = solve({ ...base, preferences: prefs });
    expect(out.length).toBeGreaterThan(0);
    for (const sol of out) {
      expect(sol.courses).toContain("INFR10067");
      expect(sol.courses).not.toContain("INFR10065");
      expect(sol.reasons).toContain("INFR10067 pinned by you");
      expect(sol.reasons).toContain("INFR10067 keyword: security");
    }
  });

  it("ranks years by how well they fit a painted free block", () => {
    const thursday: Preferences = { ...emptyPrefs, blocks: [{ id: "t", day: 3, start: 8 * 60, end: 18 * 60, kind: "free" }] };
    const out = solve({ ...base, preferences: thursday });
    const plain = solve({ ...base, preferences: emptyPrefs });
    expect(out.length).toBeGreaterThan(0);
    const byCode = new Map(courses.map((c) => [c.code, c]));
    const plainUnderThursday = score(plain[0].courses.map((c) => byCode.get(c)!), plain[0].groups, slots, thursday).score;
    expect(out[0].score).toBeGreaterThanOrEqual(plainUnderThursday);
    expect(out[0].courses).not.toEqual(plain[0].courses);
  });

  it("still answers when two compulsory courses clash in the published timetable, marking it unavoidable", () => {
    const y2 = years.find((y) => y.year === 2)!;
    const out = solve({
      ...base,
      programme: y2,
      preferences: emptyPrefs,
      student: { ...student, year: 2, passed: years.filter((y) => y.year < 2).flatMap((y) => y.compulsory) },
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].violations[0]).toMatch(/^Unavoidable: Clash: INFR08030 .* INFR08032/);
    expect(out[0].score).toBeGreaterThan(CLASH_PENALTY);
    const scores = out.map((s) => s.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("respects count", () => {
    expect(solve({ ...base, preferences: emptyPrefs, count: 1 })).toHaveLength(1);
  });
});
