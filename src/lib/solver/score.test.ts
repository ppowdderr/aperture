import { describe, expect, it } from "vitest";
import type { Course, Preferences, Slot } from "../types";
import { UNAVOIDABLE, WEIGHTS, chosenSlots, fmtHours, fmtTime, score } from "./score";

function course(code: string, title: string): Course {
  return { code, title, credits: 20, level: 10, semester: 1, school: "Informatics", prerequisitesText: "", drpsUrl: "" };
}
function slot(course: string, day: Slot["day"], start: number, end: number, extra: Partial<Slot> = {}): Slot {
  return { course, activity: "Lecture", semester: 1, day, start, end, weeks: [1, 2, 3], room: "AT 2.12", campus: "central", ...extra };
}
const prefs = (p: Partial<Preferences> = {}): Preferences => ({
  blocks: [], earliestStart: null, latestEnd: null, maxBackToBackHours: null, maxGapHours: null, campusDaysTogether: false, wantKeywords: [], pinned: [], excluded: [], ...p,
});
const SEC = course("INFR10067", "Computer Security");
const CT = course("INFR10065", "Compiling Techniques");

describe("score", () => {
  it("is 0 with no preferences, whatever the day looks like", () => {
    expect(score([SEC], {}, [slot("INFR10067", 0, 600, 650)], prefs())).toEqual({ score: 0, violations: [] });
    const brutal = [slot("INFR10067", 0, 480, 600), slot("INFR10065", 0, 900, 1080, { campus: "kb" })];
    expect(score([SEC, CT], {}, brutal, prefs())).toEqual({ score: 0, violations: [] });
  });

  it("reports misses caused only by fixed compulsory slots as unavoidable and leaves them unscored", () => {
    const lecture = [slot("INFR10067", 0, 600, 660)];
    const p = prefs({ blocks: [{ id: "b", day: 0, start: 540, end: 720, kind: "free" }], earliestStart: 660 });
    const r = score([SEC], {}, lecture, p, new Set(["INFR10067"]));
    expect(r.score).toBe(0);
    expect(r.violations.every((v) => v.startsWith(UNAVOIDABLE))).toBe(true);
    expect(r.violations).toHaveLength(2);
    // a tutorial group is a choice, so the same miss on a compulsory course's tutorial still counts
    const tut = [slot("INFR10067", 0, 600, 660, { activity: "Tutorial", group: "n01" })];
    expect(score([SEC], { "INFR10067:Tutorial": "n01" }, tut, p, new Set(["INFR10067"])).score).toBe(WEIGHTS.freeHour + WEIGHTS.earlyStart);
  });

  it("penalises a lecture in a free block far more than in an avoid block, and rewards prefer", () => {
    const lecture = [slot("INFR10067", 0, 600, 660)];
    const block = (kind: Preferences["blocks"][number]["kind"]) => prefs({ blocks: [{ id: "b", day: 0, start: 540, end: 720, kind }] });
    const free = score([SEC], {}, lecture, block("free"));
    const avoid = score([SEC], {}, lecture, block("avoid"));
    const prefer = score([SEC], {}, lecture, block("prefer"));
    expect(free.score).toBe(WEIGHTS.freeHour);
    expect(avoid.score).toBe(WEIGHTS.avoidHour);
    expect(prefer.score).toBe(WEIGHTS.preferHour);
    expect(free.score).toBeLessThan(avoid.score);
    expect(free.violations).toEqual(["INFR10067 Computer Security lecture S1 Mon 10:00–11:00 falls in time you kept free"]);
    expect(avoid.violations[0]).toContain("rather avoid");
    expect(prefer.violations).toEqual([]);
  });

  it("scales block penalties by overlapping hours and ignores other days", () => {
    const half = score([SEC], {}, [slot("INFR10067", 0, 600, 630)], prefs({ blocks: [{ id: "b", day: 0, start: 540, end: 720, kind: "avoid" }] }));
    expect(half.score).toBe(WEIGHTS.avoidHour / 2);
    const other = score([SEC], {}, [slot("INFR10067", 1, 600, 630)], prefs({ blocks: [{ id: "b", day: 0, start: 540, end: 720, kind: "free" }] }));
    expect(other.score).toBe(0);
  });

  it("flags early starts and late finishes per semester-day when asked", () => {
    const r = score([SEC, CT], {}, [slot("INFR10067", 0, 540, 590), slot("INFR10065", 0, 1020, 1070)], prefs({ earliestStart: 600, latestEnd: 1020 }));
    expect(r.score).toBe(WEIGHTS.earlyStart + WEIGHTS.lateFinish);
    expect(r.violations).toEqual([
      "INFR10065 Compiling Techniques lecture S1 Mon 17:00–17:50 finishes after 17:00",
      "INFR10067 Computer Security lecture S1 Mon 09:00–09:50 starts before 10:00",
    ]);
  });

  it("flags gaps longer than maxGapHours", () => {
    const r = score([SEC, CT], {}, [slot("INFR10067", 2, 600, 660), slot("INFR10065", 2, 900, 960)], prefs({ maxGapHours: 3 }));
    expect(r.score).toBe(WEIGHTS.longGap);
    expect(r.violations).toEqual(["4 h gap before INFR10065 Compiling Techniques lecture S1 Wed 15:00–16:00"]);
    expect(score([SEC, CT], {}, [slot("INFR10067", 2, 600, 660), slot("INFR10065", 2, 900, 960)], prefs({ maxGapHours: 4 })).score).toBe(0);
  });

  it("flags back-to-back runs longer than maxBackToBackHours", () => {
    const slots = [slot("INFR10067", 3, 600, 720), slot("INFR10065", 3, 720, 840), slot("INFR10065", 3, 840, 900, { activity: "Tutorial", group: "n01" })];
    const r = score([SEC, CT], { "INFR10065:Tutorial": "n01" }, slots, prefs({ maxBackToBackHours: 4 }));
    expect(r.score).toBe(WEIGHTS.longRun);
    expect(r.violations).toEqual(["5 h back-to-back ending with INFR10065 Compiling Techniques tutorial S1 Thu 14:00–15:00"]);
    expect(score([SEC, CT], { "INFR10065:Tutorial": "n01" }, slots, prefs({ maxBackToBackHours: 5 })).score).toBe(0);
  });

  it("penalises mixed campuses in a day only when asked", () => {
    const slots = [slot("INFR10067", 1, 600, 660), slot("INFR10065", 1, 720, 780, { campus: "kb" })];
    expect(score([SEC, CT], {}, slots, prefs()).score).toBe(0);
    const r = score([SEC, CT], {}, slots, prefs({ campusDaysTogether: true }));
    expect(r.score).toBe(WEIGHTS.campusSwitch);
    expect(r.violations).toEqual(["S1 Tue mixes campuses: INFR10067 10:00 (central), INFR10065 12:00 (kb)"]);
  });

  it("rewards keyword matches in course titles, case-insensitively", () => {
    const r = score([SEC, CT], {}, [], prefs({ wantKeywords: ["security", "COMPIL", "databases", " "] }));
    expect(r.score).toBe(2 * WEIGHTS.keyword);
    expect(r.violations).toEqual([]);
  });

  it("only counts the chosen tutorial group", () => {
    const slots = [
      slot("INFR10067", 0, 600, 650),
      slot("INFR10067", 0, 540, 590, { activity: "Tutorial", group: "n01" }),
      slot("INFR10067", 0, 660, 710, { activity: "Tutorial", group: "n02" }),
    ];
    expect(chosenSlots(["INFR10067"], { "INFR10067:Tutorial": "n02" }, slots).map((s) => s.start)).toEqual([600, 660]);
    expect(score([SEC], { "INFR10067:Tutorial": "n02" }, slots, prefs()).score).toBe(0);
    expect(score([SEC], { "INFR10067:Tutorial": "n01" }, slots, prefs({ earliestStart: 600 })).score).toBe(WEIGHTS.earlyStart);
  });

  it("is deterministic regardless of slot order", () => {
    const slots = [slot("INFR10067", 0, 540, 600), slot("INFR10065", 0, 840, 900), slot("INFR10065", 4, 1020, 1080)];
    const p = prefs({ blocks: [{ id: "b", day: 4, start: 960, end: 1080, kind: "free" }], campusDaysTogether: true, earliestStart: 600, latestEnd: 1020, maxGapHours: 3 });
    const a = score([SEC, CT], {}, slots, p);
    const b = score([CT, SEC], {}, [...slots].reverse(), p);
    expect(a).toEqual(b);
    expect(a.violations.length).toBe(4);
  });

  it("formats times and hours", () => {
    expect(fmtTime(540)).toBe("09:00");
    expect(fmtTime(1010)).toBe("16:50");
    expect(fmtHours(4)).toBe("4");
    expect(fmtHours(25 / 6)).toBe("4.2");
    const r = score([SEC, CT], {}, [slot("INFR10067", 2, 600, 660), slot("INFR10065", 2, 910, 960)], prefs({ maxGapHours: 3 }));
    expect(r.violations[0]).toMatch(/^4\.2 h gap before/);
    expect(Number.isInteger(score([SEC], {}, [slot("INFR10067", 0, 600, 650)], prefs({ blocks: [{ id: "b", day: 0, start: 540, end: 720, kind: "avoid" }] })).score)).toBe(true);
  });
});
