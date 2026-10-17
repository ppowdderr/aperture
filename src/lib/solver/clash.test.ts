import { describe, expect, it } from "vitest";
import type { Slot } from "../types";
import { assignGroups, groupKey } from "./clash";

function slot(overrides: Partial<Slot> = {}): Slot {
  return {
    course: "INFR08030",
    activity: "Lecture",
    semester: 1,
    day: 0,
    start: 540,
    end: 600,
    weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    room: "Appleton Tower 1.01",
    campus: "central",
    ...overrides,
  };
}

describe("assignGroups", () => {
  it("reports two overlapping lectures with both slots named", () => {
    const result = assignGroups(
      ["INFR08030", "INFR08035"],
      [
        slot({ course: "INFR08030" }),
        slot({
          course: "INFR08035",
          room: "University Central Area",
          campus: "other",
        }),
      ],
    );

    expect(result.ok).toBe(false);
    expect(result.clashes).toHaveLength(1);
    expect(result.clashes[0]).toContain("INFR08030 Lecture");
    expect(result.clashes[0]).toContain("INFR08035 Lecture");
  });

  it("chooses a tutorial group that avoids a lecture clash", () => {
    const result = assignGroups(
      ["INFR08030", "INFR08035"],
      [
        slot({ course: "INFR08030" }),
        slot({
          course: "INFR08035",
          activity: "Tutorial",
          group: "Group 1",
        }),
        slot({
          course: "INFR08035",
          activity: "Tutorial",
          group: "Group 2",
          day: 1,
        }),
      ],
    );

    expect(result.ok).toBe(true);
    expect(result.clashes).toEqual([]);
    expect(result.groups[groupKey("INFR08035", "Tutorial")]).toBe("Group 2");
  });

  it("does not treat non-overlapping weeks as a clash", () => {
    const result = assignGroups(
      ["INFR08030", "INFR08035"],
      [
        slot({ course: "INFR08030", weeks: [1, 2, 3] }),
        slot({ course: "INFR08035", weeks: [4, 5, 6] }),
      ],
    );

    expect(result).toEqual({ ok: true, groups: {}, clashes: [] });
  });

  it("does not clash across semesters", () => {
    const result = assignGroups(
      ["INFR08030", "INFR08035"],
      [
        slot({ course: "INFR08030", semester: 1 }),
        slot({ course: "INFR08035", semester: 2 }),
      ],
    );

    expect(result.ok).toBe(true);
  });

  it("ignores courses outside the selected set", () => {
    const result = assignGroups(
      ["INFR08030"],
      [
        slot({ course: "INFR08030" }),
        slot({ course: "INFR08035" }),
      ],
    );

    expect(result.ok).toBe(true);
  });

  it("reports the closest conflicting assignment when no group works", () => {
    const result = assignGroups(
      ["INFR08030", "INFR08035", "INFR10086"],
      [
        slot({ course: "INFR08030" }),
        slot({ course: "INFR08035", start: 600, end: 660 }),
        slot({
          course: "INFR10086",
          activity: "Tutorial",
          group: "Group 1",
        }),
        slot({
          course: "INFR10086",
          activity: "Tutorial",
          group: "Group 2",
          start: 600,
          end: 660,
        }),
      ],
    );

    expect(result.ok).toBe(false);
    expect(result.clashes.length).toBeGreaterThan(0);
    expect(result.clashes.join(" ")).toContain("INFR10086 Tutorial");
  });
});
