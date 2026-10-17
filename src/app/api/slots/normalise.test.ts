import { describe, expect, it } from "vitest";
import { normaliseSlotRows } from "./normalise";

describe("normaliseSlotRows", () => {
  it("removes Mongo null optional groups so the shared Slot schema can validate them", () => {
    const [slot] = normaliseSlotRows([
      {
        course: "INFR10067",
        activity: "Lecture",
        group: null,
        semester: 1,
        day: 0,
        start: 600,
        end: 660,
        weeks: [1],
        room: "AT",
        campus: "central",
      },
    ]);

    expect(slot).not.toHaveProperty("group");
    expect(slot).toMatchObject({ course: "INFR10067", activity: "Lecture" });
  });
});
