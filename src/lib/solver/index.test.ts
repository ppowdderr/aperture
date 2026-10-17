import { describe, expect, it } from "vitest";
import { solve } from "./index";
import type { Preferences } from "../types";

const emptyPrefs: Preferences = {
  grid: Array.from({ length: 5 }, () => Array<null>(11).fill(null)),
  maxBackToBackHours: 4, maxGapHours: 3, campusDaysTogether: false,
  wantKeywords: [], pinned: [], excluded: [],
};

describe("solve (stub)", () => {
  it("returns an array", () => {
    const out = solve({
      programme: { programmeCode: "X", programmeTitle: "X", year: 1, compulsory: [], groups: [], notesText: "", drpsUrl: "" },
      courses: [], slots: [], preferences: emptyPrefs,
      student: { programmeCode: "X", year: 1, passed: [], background: {} },
    });
    expect(Array.isArray(out)).toBe(true);
  });
});
