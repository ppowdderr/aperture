import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LANDING_CONTENT } from "./landing-content";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(strings);
  }
  return [];
}

function json<T>(path: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), path), "utf8")) as T;
}

describe("landing content", () => {
  it("uses the approved flip and keeps visible copy free of em and en dashes", () => {
    expect(LANDING_CONTENT.hero.headline).toEqual([
      "Describe the week.",
      "Choose the legal year.",
    ]);
    expect(LANDING_CONTENT.flip.oldText).toBe(
      "Pick courses, then discover the timetable they produce.",
    );
    expect(LANDING_CONTENT.flip.newText).toBe(
      "Describe the week, then get the legal course sets that can produce it.",
    );

    for (const value of strings(LANDING_CONTENT)) {
      expect(value).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it("keeps the demo labels and honest limits visible", () => {
    expect(LANDING_CONTENT.preview.shared.demoLabel).toContain("Demo data");
    expect(LANDING_CONTENT.preview.shared.simulatedLabel).toContain(
      "Simulated preview",
    );

    const limits = LANDING_CONTENT.limits.items.map((item) => item.body).join(" ");
    expect(limits).toContain("66 of 68");
    expect(limits).toContain("does not pull live university data");
    expect(limits).toContain("university allocates groups and enrolment");
    expect(limits).toContain("configured LLM endpoint");
  });

  it("matches the committed programme and timetable counts", () => {
    const courseRows = json<unknown[]>("data/courses-UTCMPSI.json");
    const slotRows = json<unknown[]>("data/slots-UTCMPSI.json");
    const programmeRows = json<unknown[]>("data/programme-UTCMPSI.json");
    const values = new Map(
      LANDING_CONTENT.stats.items.map((item) => [item.label, item.value]),
    );

    expect(values.get("course records")).toBe(String(courseRows.length));
    expect(values.get("timetable slots")).toBe(String(slotRows.length));
    expect(values.get("programme years")).toBe(String(programmeRows.length));
    expect(values.get("end-to-end programme")).toBe("1");
  });

  it("contains three complete interactive example sets", () => {
    expect(LANDING_CONTENT.how.steps).toHaveLength(3);
    expect(LANDING_CONTENT.preview.hero).toHaveLength(3);
    for (const scenario of LANDING_CONTENT.preview.hero) {
      expect(scenario.chips.length).toBeGreaterThan(0);
      expect(scenario.plans).toHaveLength(3);
      for (const plan of scenario.plans) {
        expect(plan.courses.reduce((sum, course) => sum + course.credits, 0)).toBe(
          120,
        );
        expect(plan.blocks[1].length).toBeGreaterThan(0);
        expect(plan.blocks[2].length).toBeGreaterThan(0);
      }
    }
  });
});
