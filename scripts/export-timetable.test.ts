import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTimetable } from "./export-timetable";

const html = readFileSync(
  new URL("./fixtures/timetable-sample.html", import.meta.url),
  "utf8",
);

describe("parseTimetable", () => {
  it("parses full-class and grouped events", () => {
    const slots = parseTimetable(
      html,
      new Set(["INFR10086", "INFR10079"]),
    );

    expect(slots).toHaveLength(4);
    expect(slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          course: "INFR10086",
          activity: "Lecture",
          semester: 2,
          day: 2,
          start: 670,
          end: 720,
          weeks: [1, 2],
          room: "Lecture Theatre 3 - Appleton Tower",
          campus: "central",
        }),
        expect.objectContaining({
          course: "INFR10079",
          activity: "Tutorial",
          group: "s01",
          semester: 2,
          day: 1,
          start: 660,
          end: 710,
        }),
      ]),
    );
  });

  it("ignores courses not selected for the programme", () => {
    const slots = parseTimetable(html, new Set(["INFR10079"]));

    expect(slots.every((slot) => slot.course === "INFR10079")).toBe(true);
  });
});
