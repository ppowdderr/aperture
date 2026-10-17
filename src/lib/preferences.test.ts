import { describe, expect, it } from "vitest";
import { emptyPreferences } from "../components/WeekGrid";
import { hasAppliedPreferences } from "./preferences";

describe("hasAppliedPreferences", () => {
  it("is false for untouched defaults", () => {
    expect(hasAppliedPreferences(emptyPreferences())).toBe(false);
  });

  it("is true for any user constraint", () => {
    expect(hasAppliedPreferences({ ...emptyPreferences(), earliestStart: 600 })).toBe(true);
    expect(hasAppliedPreferences({ ...emptyPreferences(), wantKeywords: ["databases"] })).toBe(true);
    expect(
      hasAppliedPreferences({
        ...emptyPreferences(),
        blocks: [{ id: "fri", day: 4, start: 480, end: 1080, kind: "free" }],
      }),
    ).toBe(true);
  });
});
